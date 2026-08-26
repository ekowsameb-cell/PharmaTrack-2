import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Barcode, 
  ShoppingCart, 
  UserCheck, 
  FileCheck2, 
  Trash2, 
  Plus, 
  Minus, 
  AlertOctagon, 
  Sparkles, 
  ArrowRight,
  Stethoscope,
  ShoppingBag,
  Clock,
  ShieldAlert,
  CreditCard,
  Building,
  Check,
  ChevronDown
} from 'lucide-react';
import { 
  DrugItem, 
  DrugBatch, 
  CartItem, 
  PosLaneType, 
  PatientProfile, 
  PrescriptionDetails,
  PharmacyConfig
} from '../types/pharmacy';
import { evaluateExpiryStatus } from '../services/storageService';
import { isClassAControlledDrug } from '../services/ddrService';

interface PosLaneProps {
  drugs: DrugItem[];
  patients: PatientProfile[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  currentLane: PosLaneType;
  setCurrentLane: (lane: PosLaneType) => void;
  selectedPatient: PatientProfile | null;
  setSelectedPatient: (patient: PatientProfile | null) => void;
  prescription: PrescriptionDetails;
  setPrescription: React.Dispatch<React.SetStateAction<PrescriptionDetails>>;
  useNhisTariff: boolean;
  setUseNhisTariff: (useNhis: boolean) => void;
  onProceedToSplitCheckout: () => void;
  config: PharmacyConfig;
}

export const PosLane: React.FC<PosLaneProps> = ({
  drugs,
  patients,
  cart,
  setCart,
  currentLane,
  setCurrentLane,
  selectedPatient,
  setSelectedPatient,
  prescription,
  setPrescription,
  useNhisTariff,
  setUseNhisTariff,
  onProceedToSplitCheckout,
  config
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [dosageModalItem, setDosageModalItem] = useState<{ drug: DrugItem; batch: DrugBatch } | null>(null);
  const [dosageFormText, setDosageFormText] = useState('1 tab TDS (3 times daily) x 5/7 days');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    drugs.forEach(d => set.add(d.category));
    return ['ALL', ...Array.from(set)];
  }, [drugs]);

  // Filtered drugs
  const filteredDrugs = useMemo(() => {
    return drugs.filter(d => {
      const matchesSearch = 
        d.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.barcode.includes(searchQuery) ||
        (d.nhisCode && d.nhisCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'ALL' || d.category === selectedCategory;

      if (currentLane === 'retail') {
        // In OTC Retail lane, hide Class A controlled injectables by default unless searched
        return matchesSearch && matchesCat;
      }
      return matchesSearch && matchesCat;
    });
  }, [drugs, searchQuery, selectedCategory, currentLane]);

  // Add Item with strict FEFO Picking logic
  const handleAddToCart = (drug: DrugItem, specificBatch?: DrugBatch) => {
    // Sort batches by FEFO (earliest expiry first)
    const sortedBatches = [...drug.batches].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );

    // Pick specified batch or earliest valid batch
    let batchToPick = specificBatch || sortedBatches[0];

    if (!batchToPick) {
      alert(`No stock batches available for ${drug.brandName}`);
      return;
    }

    const expiryEval = evaluateExpiryStatus(batchToPick.expiryDate);
    if (expiryEval.isLocked) {
      alert(`SYSTEM HARD LOCK: Batch ${batchToPick.batchNumber} has under 3 months to expiration (${batchToPick.expiryDate}). GPhC regulations prohibit dispensing this batch. Please select another batch or quarantine this stock.`);
      return;
    }

    const price = useNhisTariff && drug.nhisCovered ? drug.nhisTariffPrice : drug.retailPrice;

    // Check if already in cart with same batch
    const existingIndex = cart.findIndex(
      item => item.drug.id === drug.id && item.selectedBatch.batchNumber === batchToPick.batchNumber
    );

    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      if (existing.quantity + 1 > batchToPick.quantity) {
        alert(`Cannot exceed available batch stock of ${batchToPick.quantity} units.`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex] = {
        ...existing,
        quantity: existing.quantity + 1,
        totalPrice: parseFloat(((existing.quantity + 1) * existing.unitPrice).toFixed(2))
      };
      setCart(updated);
    } else {
      const newItem: CartItem = {
        drug,
        selectedBatch: batchToPick,
        quantity: 1,
        unitPrice: price,
        dosageInstructions: currentLane === 'clinical' ? '1 tab TDS x 5 days after meals' : 'As directed on pack',
        durationDays: 5,
        totalPrice: price,
        isNhisTariff: useNhisTariff && drug.nhisCovered,
        requiresSuperintendentAuth: isClassAControlledDrug(drug.classification)
      };
      setCart([...cart, newItem]);
    }
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    const item = cart[index];
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }
    if (newQty > item.selectedBatch.quantity) {
      alert(`Only ${item.selectedBatch.quantity} available in batch ${item.selectedBatch.batchNumber}`);
      return;
    }
    const updated = [...cart];
    updated[index] = {
      ...item,
      quantity: newQty,
      totalPrice: parseFloat((newQty * item.unitPrice).toFixed(2))
    };
    setCart(updated);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = drugs.find(d => d.barcode === barcodeInput.trim());
    if (found) {
      handleAddToCart(found);
      setBarcodeInput('');
    } else {
      alert(`Barcode ${barcodeInput} not found in drug registry.`);
    }
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const hasControlledItemsInCart = useMemo(() => {
    return cart.some(item => isClassAControlledDrug(item.drug.classification));
  }, [cart]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* LEFT COLUMN: Dual-Zone Selection, Search, and Catalog (7 Cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Lane Selector & NHIS Tariff Switch Header */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">POS Lane:</span>
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
              <button
                onClick={() => setCurrentLane('retail')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentLane === 'retail'
                    ? 'bg-emerald-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>OTC / Retail Lane</span>
              </button>
              <button
                onClick={() => setCurrentLane('clinical')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentLane === 'clinical'
                    ? 'bg-emerald-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Clinical Prescription (Rx)</span>
              </button>
            </div>
          </div>

          {/* NHIS Medicines Tariff Pricing Toggle */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={useNhisTariff}
                onChange={(e) => setUseNhisTariff(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className={useNhisTariff ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                Apply NHIS Fixed Tariff
              </span>
            </label>
          </div>
        </div>

        {/* Clinical Prescription Patient Profile & Prescriber Header (Visible in Clinical Lane) */}
        {currentLane === 'clinical' && (
          <div className="bg-emerald-950/30 border border-emerald-800/40 p-4 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Patient Profile & Prescriber Linkage</span>
              </div>
              <span className="text-[11px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
                GPhC Clinical Audit Mandate
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Patient Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Select Patient (Ghana Card / NHIS Verified)
                </label>
                <select
                  value={selectedPatient?.id || ''}
                  onChange={(e) => {
                    const pat = patients.find(p => p.id === e.target.value) || null;
                    setSelectedPatient(pat);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.nationalId}) - {p.nhisNumber || 'Private'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prescriber Name & MDC Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Prescribing Doctor & MDC Reg No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. K. Appiah (MDC/RN/48201)"
                  value={prescription.prescriberName}
                  onChange={(e) => setPrescription({ ...prescription, prescriberName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {selectedPatient && (
              <div className="bg-slate-950/60 p-2.5 rounded-xl text-xs flex flex-wrap items-center gap-4 text-slate-300 border border-slate-800/80">
                <div>
                  <span className="text-slate-500">NHIS No: </span>
                  <span className="font-mono font-bold text-emerald-400">{selectedPatient.nhisNumber || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status: </span>
                  <span className="text-emerald-400 font-bold">{selectedPatient.nhisStatus}</span>
                </div>
                <div>
                  <span className="text-slate-500">Private Ins: </span>
                  <span className="text-slate-200 font-semibold">{selectedPatient.privateInsuranceProvider || 'None'}</span>
                </div>
                {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                  <div className="text-red-400 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Allergies: {selectedPatient.allergies.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search Bar & Barcode Scanner */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Text Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Brand, Generic Name, Barcode, NHIS Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
            />
          </div>

          {/* Quick Barcode Scanner Input */}
          <form onSubmit={handleBarcodeScan} className="flex gap-2">
            <div className="relative">
              <Barcode className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Scan barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-36 pl-8 pr-2 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Scan
            </button>
          </form>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          {filteredDrugs.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500">
              <AlertOctagon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No pharmaceutical items match "{searchQuery}"</p>
            </div>
          ) : (
            filteredDrugs.map(drug => {
              const totalStock = drug.batches.reduce((s, b) => s + b.quantity, 0);
              const earliestBatch = [...drug.batches].sort(
                (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
              )[0];
              const expiryEval = earliestBatch ? evaluateExpiryStatus(earliestBatch.expiryDate) : null;
              const isControlled = isClassAControlledDrug(drug.classification);

              return (
                <div
                  key={drug.id}
                  className={`bg-slate-900 border transition-all rounded-2xl p-3.5 ${
                    isControlled
                      ? 'border-purple-800/60 bg-purple-950/10 hover:border-purple-600'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm">{drug.brandName}</span>
                        <span className="text-xs text-slate-400">{drug.strength}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          {drug.dosageForm}
                        </span>

                        {isControlled && (
                          <span className="text-[10px] font-bold bg-purple-900/80 text-purple-300 border border-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Class A Controlled
                          </span>
                        )}

                        {drug.nhisCovered && (
                          <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
                            NHIS Covered
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-0.5 truncate">
                        {drug.genericName} • <span className="text-slate-500">{drug.category}</span>
                      </div>

                      {/* FEFO Batches Display */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] text-slate-500 font-semibold">Batches (FEFO):</span>
                        {drug.batches.map(batch => {
                          const bEval = evaluateExpiryStatus(batch.expiryDate);
                          return (
                            <button
                              key={batch.batchNumber}
                              onClick={() => handleAddToCart(drug, batch)}
                              disabled={bEval.isLocked}
                              className={`text-[11px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1 transition-all border ${
                                bEval.status === 'green'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                                  : bEval.status === 'yellow'
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900/60'
                                  : 'bg-red-950/60 text-red-400 border-red-800 opacity-60 cursor-not-allowed line-through'
                              }`}
                              title={`Batch ${batch.batchNumber} - Exp: ${batch.expiryDate} (${bEval.monthsRemaining} mo remaining) - Qty: ${batch.quantity}`}
                            >
                              <span>{batch.batchNumber}</span>
                              <span className="text-[9px] opacity-80">({batch.quantity})</span>
                              {bEval.status === 'red' && <span className="text-[9px] font-bold">LOCKED</span>}
                              {bEval.status === 'yellow' && <span className="text-[9px]">Markdown 20%</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price and Add Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-400 font-mono">
                          GHS {(useNhisTariff && drug.nhisCovered ? drug.nhisTariffPrice : drug.retailPrice).toFixed(2)}
                        </div>
                        {useNhisTariff && drug.nhisCovered && (
                          <div className="text-[10px] text-slate-500 line-through">
                            Retail: GHS {drug.retailPrice.toFixed(2)}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleAddToCart(drug)}
                        disabled={totalStock <= 0 || (expiryEval && expiryEval.isLocked)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow ${
                          expiryEval && expiryEval.isLocked
                            ? 'bg-red-950/80 text-red-400 border border-red-800 cursor-not-allowed'
                            : totalStock <= 0
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{expiryEval && expiryEval.isLocked ? 'Locked' : 'Dispense'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Dispensing Cart & Split-Billing Trigger (5 Cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col min-h-[580px]">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-slate-100 text-base">Dispensing Cart</h2>
              <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono">
                {cart.length} items
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto my-3 space-y-3 pr-1 max-h-[360px]">
            {cart.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 px-4">
                <ShoppingBag className="w-12 h-12 mb-3 stroke-1 text-slate-600" />
                <p className="text-sm font-semibold">Cart is currently empty</p>
                <p className="text-xs text-slate-500 mt-1">
                  Scan barcode or click '+ Dispense' on drugs to begin checkout.
                </p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const isControlled = isClassAControlledDrug(item.drug.classification);
                return (
                  <div
                    key={`${item.drug.id}-${item.selectedBatch.batchNumber}-${idx}`}
                    className={`bg-slate-950 p-3.5 rounded-2xl border ${
                      isControlled ? 'border-purple-800/70 bg-purple-950/20' : 'border-slate-800/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 text-xs sm:text-sm">
                            {item.drug.brandName}
                          </span>
                          {isControlled && (
                            <span className="text-[9px] bg-purple-900 text-purple-200 px-1.5 py-0.2 rounded font-bold">
                              DDR
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Batch: <span className="font-mono text-emerald-400">{item.selectedBatch.batchNumber}</span> (Exp: {item.selectedBatch.expiryDate})
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quantity Controls & Price */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-900">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-xs w-6 text-center text-slate-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-[11px] text-slate-500">@ GHS {item.unitPrice.toFixed(2)}</span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-100 text-xs sm:text-sm">
                          GHS {item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Dosage Instructions in Clinical Lane */}
                    {currentLane === 'clinical' && (
                      <div className="mt-2 text-[11px] bg-slate-900 p-1.5 rounded-lg text-slate-300 border border-slate-800">
                        <span className="text-slate-500 font-semibold">Dosage: </span>
                        <input
                          type="text"
                          value={item.dosageInstructions || ''}
                          onChange={(e) => {
                            const updated = [...cart];
                            updated[idx].dosageInstructions = e.target.value;
                            setCart(updated);
                          }}
                          placeholder="e.g. 1 tab TDS x 5 days after meals"
                          className="bg-transparent border-0 text-[11px] text-emerald-300 focus:outline-none w-48 p-0"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Controlled Drugs Warning Indicator */}
          {hasControlledItemsInCart && (
            <div className="bg-purple-950/60 border border-purple-700/60 p-3 rounded-2xl mb-3 flex items-center gap-2 text-xs text-purple-300 animate-pulse">
              <ShieldAlert className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>
                <strong>GPhC Regulated Item in Cart:</strong> Will record in Dangerous Drugs Register (DDR) with Superintendent authorization.
              </span>
            </div>
          )}

          {/* Subtotal & Checkout Button */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Items Total:</span>
              <span className="font-mono font-bold text-slate-200">GHS {cartTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-sm font-bold text-slate-100">
              <span>Gross Payable:</span>
              <span className="text-xl font-mono text-emerald-400 font-black">
                GHS {cartTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={onProceedToSplitCheckout}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                cart.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/50'
              }`}
            >
              <span>Split-Billing & Ghana Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
