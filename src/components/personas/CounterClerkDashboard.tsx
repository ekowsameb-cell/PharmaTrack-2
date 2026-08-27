import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  Plus, 
  Minus, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  Clock, 
  Package, 
  Layers, 
  User, 
  Phone, 
  FileText,
  Boxes,
  LogOut
} from 'lucide-react';
import { 
  DrugItem, 
  DrugBatch, 
  BasketItemWithUnit, 
  CounterBasketQueueItem, 
  UnitSaleType,
  PatientProfile,
  PharmacyConfig,
  UserRole
} from '../../types/pharmacy';
import { evaluateExpiryStatus } from '../../services/storageService';
import { useRoleGuard } from '../../hooks/useRoleGuard';

interface CounterClerkDashboardProps {
  drugs: DrugItem[];
  patients: PatientProfile[];
  queue: CounterBasketQueueItem[];
  onAddToQueue: (basket: CounterBasketQueueItem) => void;
  config: PharmacyConfig;
  currentUserRole?: UserRole | string;
  onLogout?: () => void;
}

export const CounterClerkDashboard: React.FC<CounterClerkDashboardProps> = ({
  drugs,
  patients,
  queue,
  onAddToQueue,
  config,
  currentUserRole = 'Clerk',
  onLogout
}) => {
  const roleGuard = useRoleGuard(currentUserRole);
  // Clerk State
  const clerkName = 'Kwame Mensah (Counter Sales Assistant)';
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSaleUnit, setActiveSaleUnit] = useState<Record<string, UnitSaleType>>({});
  const [activeBasket, setActiveBasket] = useState<BasketItemWithUnit[]>([]);
  const [clerkNotes, setClerkNotes] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('Walk-in Customer');
  const [patientPhone, setPatientPhone] = useState<string>('0244000000');
  const [schemeType, setSchemeType] = useState<'CASH' | 'NHIS' | 'PRIVATE_INSURANCE'>('CASH');
  const [insuranceProvider, setInsuranceProvider] = useState<string>('Nationwide Medical Insurance');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState<string>('');
  const [lastSentToken, setLastSentToken] = useState<string | null>(null);

  // Search input ref for hotkey focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hotkey listener (Ctrl + / or / to focus search, F2 to Stage Order)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === '/') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F2 -> Stage Order for Dispensary
      if (e.key === 'F2' && activeBasket.length > 0) {
        e.preventDefault();
        handleStageOrder();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBasket, patientName, patientPhone, schemeType, clerkNotes]);

  // Filtered drugs for Read-Only Inventory lookup
  const filteredDrugs = drugs.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.brandName.toLowerCase().includes(q) ||
      d.genericName.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.barcode.includes(q) ||
      d.batches.some(b => b.location.toLowerCase().includes(q))
    );
  }).slice(0, 10);

  const handleAddItemToBasket = (drug: DrugItem) => {
    // Select earliest expiry batch (FEFO)
    const validBatches = [...drug.batches].filter(b => b.quantity > 0);
    if (validBatches.length === 0) return;
    
    // Sort FEFO
    validBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    const bestBatch = validBatches[0];
    const expiryEval = evaluateExpiryStatus(bestBatch.expiryDate);

    if (expiryEval.isLocked) {
      alert(`System Security Lock: Batch ${bestBatch.batchNumber} has expired or is in quarantine.`);
      return;
    }

    const saleUnit = activeSaleUnit[drug.id] || 'box';

    const existingIndex = activeBasket.findIndex(
      (item) => item.drug.id === drug.id && item.saleUnit === saleUnit && item.selectedBatch.batchNumber === bestBatch.batchNumber
    );

    if (existingIndex >= 0) {
      const updated = [...activeBasket];
      updated[existingIndex].quantity += 1;
      setActiveBasket(updated);
    } else {
      const newItem: BasketItemWithUnit = {
        id: `b-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        drug,
        selectedBatch: bestBatch,
        quantity: 1,
        saleUnit,
        unitsPerPack: drug.packSize,
        unitPriceGhs: drug.retailPrice, // Kept internal for payload only
        totalPriceGhs: drug.retailPrice,
        expirySafe: !expiryEval.isLocked,
        expiryDate: bestBatch.expiryDate,
        requiresDoctorMdc: drug.classification === 'ClassA_Controlled'
      };
      setActiveBasket([...activeBasket, newItem]);
    }
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const updated = activeBasket
      .map((item) => {
        if (item.id === itemId) {
          const newQty = Math.max(0, item.quantity + delta);
          return {
            ...item,
            quantity: newQty,
            totalPriceGhs: newQty * item.unitPriceGhs
          };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    setActiveBasket(updated);
  };

  const handleRemoveItem = (itemId: string) => {
    setActiveBasket(activeBasket.filter((i) => i.id !== itemId));
  };

  const totalItemsCount = activeBasket.reduce((sum, item) => sum + item.quantity, 0);
  const containsControlled = activeBasket.some((i) => i.drug.classification === 'ClassA_Controlled');

  // Next Queue Number generator
  const getNextQueueNumber = (): number => {
    const highest = queue.reduce((max, q) => Math.max(max, q.queueNumber), 100);
    return highest + 1;
  };

  // POST /api/v1/orders/stage simulation
  const handleStageOrder = () => {
    if (activeBasket.length === 0) return;

    roleGuard.verifyAction('STAGE_ORDER', () => {
      const qNum = getNextQueueNumber();
      const token = `Q-${qNum}`;

      // Backend intercept rule:
      // If is_controlled_class_a = TRUE or requires clinical clearance -> PENDING_CLINICAL_CLEARANCE
      // Else stages as DRAFT / staged order for workflow
      const targetStatus = containsControlled ? 'PENDING_CLINICAL_CLEARANCE' : 'DRAFT';

      const newQueueItem: CounterBasketQueueItem = {
        id: `queue-${qNum}-${Date.now()}`,
        queueNumber: qNum,
        queueToken: token,
        clerkName,
        createdAt: new Date().toISOString(),
        patientName: patientName.trim() || 'Walk-In Customer',
        patientPhone: patientPhone.trim() || '0244000000',
        schemeType,
        insuranceProviderName: schemeType === 'PRIVATE_INSURANCE' ? insuranceProvider : undefined,
        insurancePolicyNumber: schemeType !== 'CASH' ? insurancePolicyNumber : undefined,
        items: [...activeBasket],
        clerkNotes: clerkNotes.trim() || undefined,
        status: targetStatus,
        targetLane: containsControlled ? 'clinical' : 'retail',
        containsClassA: containsControlled,
        controlledDrugName: containsControlled 
          ? activeBasket.find(i => i.drug.classification === 'ClassA_Controlled')?.drug.brandName 
          : undefined
      };

      onAddToQueue(newQueueItem);
      setLastSentToken(token);
      setActiveBasket([]);
      setClerkNotes('');
      setPatientName('Walk-in Customer');
      setPatientPhone('0244000000');
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Clerk Role - Strict Read-Only Inventory & Staging */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Counter Clerk Dashboard</h2>
              <span className="bg-sky-950 text-sky-300 border border-sky-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Inventory Lookup & Order Staging
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Assigned User: <strong className="text-slate-200">{clerkName}</strong> • Station #01 (Non-Financial View)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Active Dispensary Queues:</span>
            <span className="font-mono font-bold text-slate-100">{queue.length}</span>
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Quick Stage:</span>
            <span className="font-mono text-sky-300 font-semibold bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/60">F2</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-slate-800 hover:border-rose-700/80 rounded-xl text-xs font-bold transition-all shadow-sm group"
              title="Log out and exit counter clerk station"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              <span>Exit Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {lastSentToken && (
        <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Order successfully staged via <code>POST /api/v1/orders/stage</code>. Token assigned: <strong>{lastSentToken}</strong>
            </span>
          </div>
          <button 
            onClick={() => setLastSentToken(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Left Side Read-Only Stock Lookup | Right Side Staging Basket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Read-Only Inventory Search & Physical Coordinates (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Search Input */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-md">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="[ SEARCH INVENTORY: Generic Name, Brand Name, or Shelf Location (Ctrl + /) ]"
                className="w-full pl-11 pr-24 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Read-Only Inventory Availability • Generic & Brand Mapping • Physical Shelf Coordinates</span>
              <span className="text-[11px] font-mono text-slate-500">{filteredDrugs.length} items</span>
            </div>
          </div>

          {/* Stock Lookup Results Table - Stripped of Financial/GHS values */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-400" />
                Products Query (Generic Name / Brand / Shelf / Stock)
              </h3>
              <span className="text-[10px] text-slate-400">Select dispensing unit and pull to staging basket</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Generic Name & Strength</th>
                    <th className="py-2.5 px-3">Brand Name</th>
                    <th className="py-2.5 px-3">Unit Selection</th>
                    <th className="py-2.5 px-3">Available Quantity</th>
                    <th className="py-2.5 px-3">Physical Shelf / Drawer</th>
                    <th className="py-2.5 px-3 text-center">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDrugs.map((drug) => {
                    const currentUnit = activeSaleUnit[drug.id] || 'box';
                    const totalUnits = drug.batches.reduce((sum, b) => sum + b.quantity, 0);
                    const primaryBatch = drug.batches[0];
                    const shelfLocation = primaryBatch?.location || 'Main Storage Rack';
                    const isOutOfStock = totalUnits <= 0;
                    const isControlled = drug.classification === 'ClassA_Controlled';

                    return (
                      <tr 
                        key={drug.id}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          isControlled ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            {drug.genericName} {drug.strength}
                            {isControlled && (
                              <span className="bg-amber-950 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-800/80">
                                Controlled (Class A)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{drug.category}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="text-slate-200 font-medium">{drug.brandName}</span>
                          <span className="text-[10px] text-slate-500 block">Pack of {drug.packSize}</span>
                        </td>

                        {/* Granular Unit Mode Selector (Box / Strip / Tablet) */}
                        <td className="py-2.5 px-3">
                          <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-950 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setActiveSaleUnit({ ...activeSaleUnit, [drug.id]: 'box' })}
                              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                                currentUnit === 'box'
                                  ? 'bg-sky-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Full Box"
                            >
                              Box
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveSaleUnit({ ...activeSaleUnit, [drug.id]: 'strip' })}
                              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                                currentUnit === 'strip'
                                  ? 'bg-sky-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Blister Strip"
                            >
                              Strip
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveSaleUnit({ ...activeSaleUnit, [drug.id]: 'tablet' })}
                              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                                currentUnit === 'tablet'
                                  ? 'bg-sky-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title="Single Tablet / Unit"
                            >
                              Tab
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          {isOutOfStock ? (
                            <span className="text-red-400 font-bold font-mono">0 Available</span>
                          ) : (
                            <span className="font-mono font-bold text-emerald-400">
                              {totalUnits} {currentUnit === 'box' ? 'Boxes' : currentUnit === 'strip' ? 'Strips' : 'Tabs'}
                            </span>
                          )}
                        </td>

                        {/* Physical Shelf Coordinates */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{shelfLocation}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleAddItemToBasket(drug)}
                            className={`p-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all mx-auto ${
                              isOutOfStock
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow'
                            }`}
                            title="Add item to staged order"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Order Staging Tray & Patient Context (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Patient Identification Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" />
                Customer & Patient Info
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Order Staging Form</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Customer / Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Abena Osei"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100 font-medium focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="0244XXXXXX"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Scheme Type Selector for Staging Context */}
            <div className="space-y-1.5 text-xs">
              <label className="block text-[11px] text-slate-400">Coverage Scheme</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSchemeType('CASH')}
                  className={`py-1.5 rounded-xl font-bold text-[11px] border transition-all ${
                    schemeType === 'CASH'
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Direct / Cash
                </button>
                <button
                  type="button"
                  onClick={() => setSchemeType('NHIS')}
                  className={`py-1.5 rounded-xl font-bold text-[11px] border transition-all ${
                    schemeType === 'NHIS'
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  NHIS Scheme
                </button>
                <button
                  type="button"
                  onClick={() => setSchemeType('PRIVATE_INSURANCE')}
                  className={`py-1.5 rounded-xl font-bold text-[11px] border transition-all ${
                    schemeType === 'PRIVATE_INSURANCE'
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Private Insurer
                </button>
              </div>

              {schemeType === 'PRIVATE_INSURANCE' && (
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <select
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100 text-xs"
                  >
                    <option value="Nationwide Medical Insurance">Nationwide Health</option>
                    <option value="Acacia Health Insurance">Acacia Health</option>
                    <option value="Apex Health Insurance">Apex Health</option>
                    <option value="Cosmopolitan Health Insurance">Cosmopolitan</option>
                    <option value="Premier Health Insurance">Premier Health</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Policy / Card Number"
                    value={insurancePolicyNumber}
                    onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100 text-xs font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Staging Basket Tray */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Boxes className="w-4 h-4 text-sky-400" />
                Staged Basket Items
              </h3>
              <span className="text-xs font-mono font-bold text-sky-400">
                {activeBasket.length} Lines ({totalItemsCount} Total Units)
              </span>
            </div>

            {activeBasket.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-2">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
                <p className="text-xs">No medicines staged in current basket.</p>
                <p className="text-[11px] text-slate-600">Search drugs on the left or press Ctrl + / to add</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {activeBasket.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-mono text-[10px]">{idx + 1}.</span>
                        <h4 className="font-bold text-slate-100 truncate">{item.drug.brandName}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-slate-300">{item.drug.genericName}</span>
                        <span>•</span>
                        <span className="capitalize bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 font-medium">
                          Unit: {item.saleUnit}
                        </span>
                        <span>•</span>
                        <span className="text-amber-400 font-mono">
                          Shelf: {item.selectedBatch.location}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="p-1 text-slate-400 hover:text-slate-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-slate-100">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="p-1 text-slate-400 hover:text-slate-200"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Notes for Pharmacist */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-500" />
                Notes for Pharmacist / Dispensary
              </label>
              <input
                type="text"
                value={clerkNotes}
                onChange={(e) => setClerkNotes(e.target.value)}
                placeholder="e.g. 'Patient has mild throat irritation' or 'Requested local formulation'"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Backend Controlled Drug Intercept Badge (Informational only - no doctor forms on clerk screen) */}
            {containsControlled && (
              <div className="bg-amber-950/50 border border-amber-800/80 p-2.5 rounded-xl flex items-start gap-2 text-xs text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Backend Intercept Notice:</strong> This basket contains Schedule 2/Class A items. The backend will route this payload to <code>PENDING_CLINICAL_CLEARANCE</code> for Pharmacist validation.
                </span>
              </div>
            )}

            {/* Single Order Staging Trigger */}
            <div className="pt-2">
              <button
                type="button"
                disabled={activeBasket.length === 0}
                onClick={handleStageOrder}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                  activeBasket.length === 0
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
                }`}
                title="Stage order to queue (POST /api/v1/orders/stage) - Hotkey: F2"
              >
                <Send className="w-4 h-4" />
                <span>STAGE ORDER FOR DISPENSARY (POST /api/v1/orders/stage) • [F2]</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
