import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Lock, 
  TrendingUp, 
  Calendar, 
  Plus, 
  FileSpreadsheet, 
  Truck, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw,
  Clock,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { DrugItem, DrugBatch, PharmacyConfig } from '../types/pharmacy';
import { evaluateExpiryStatus, calculateReorderPoint } from '../services/storageService';

interface InventoryFefoProps {
  drugs: DrugItem[];
  onUpdateDrug: (drug: DrugItem) => void;
  onAddNewDrug: (drug: DrugItem) => void;
  config: PharmacyConfig;
  onRequireSuperintendentPin: (onSuccess: () => void) => void;
  isSuperintendentUnlocked: boolean;
}

export const InventoryFefo: React.FC<InventoryFefoProps> = ({
  drugs,
  onUpdateDrug,
  onAddNewDrug,
  config,
  onRequireSuperintendentPin,
  isSuperintendentUnlocked
}) => {
  const [search, setSearch] = useState('');
  const [filterExpiry, setFilterExpiry] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED_LOCKED'>('ALL');
  const [filterReorder, setFilterReorder] = useState<'ALL' | 'REORDER_NEEDED'>('ALL');
  const [selectedDrugForBatch, setSelectedDrugForBatch] = useState<DrugItem | null>(null);

  // New Batch Form States
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newQuantity, setNewQuantity] = useState<number>(50);
  const [newCostPrice, setNewCostPrice] = useState<number>(20);
  const [newLocation, setNewLocation] = useState('Shelf A-1');
  const [newManufacturer, setNewManufacturer] = useState('Ernest Chemists / Tobinco');

  // Purchase Order Generation Modal state
  const [generatedPo, setGeneratedPo] = useState<string | null>(null);

  // Filtered Drugs
  const processedDrugs = useMemo(() => {
    return drugs.filter(drug => {
      const matchesSearch = 
        drug.brandName.toLowerCase().includes(search.toLowerCase()) ||
        drug.genericName.toLowerCase().includes(search.toLowerCase()) ||
        drug.barcode.includes(search);

      // Evaluate batches
      const batchStatuses = drug.batches.map(b => evaluateExpiryStatus(b.expiryDate).status);

      let matchesExpiry = true;
      if (filterExpiry === 'GREEN') matchesExpiry = batchStatuses.includes('green');
      if (filterExpiry === 'YELLOW') matchesExpiry = batchStatuses.includes('yellow');
      if (filterExpiry === 'RED_LOCKED') matchesExpiry = batchStatuses.includes('red');

      let matchesReorder = true;
      if (filterReorder === 'REORDER_NEEDED') {
        const ropInfo = calculateReorderPoint(drug);
        matchesReorder = ropInfo.status === 'CRITICAL_REORDER' || ropInfo.status === 'REORDER_RECOMMENDED';
      }

      return matchesSearch && matchesExpiry && matchesReorder;
    });
  }, [drugs, search, filterExpiry, filterReorder]);

  // Overall Inventory Stats
  const stats = useMemo(() => {
    let totalStockCount = 0;
    let totalValueGhs = 0;
    let greenBatchesCount = 0;
    let yellowBatchesCount = 0;
    let redBatchesCount = 0;
    let reorderNeededCount = 0;

    drugs.forEach(d => {
      d.batches.forEach(b => {
        totalStockCount += b.quantity;
        totalValueGhs += b.quantity * b.costPrice;
        const evalRes = evaluateExpiryStatus(b.expiryDate);
        if (evalRes.status === 'green') greenBatchesCount++;
        if (evalRes.status === 'yellow') yellowBatchesCount++;
        if (evalRes.status === 'red') redBatchesCount++;
      });

      const rop = calculateReorderPoint(d);
      if (rop.status === 'CRITICAL_REORDER' || rop.status === 'REORDER_RECOMMENDED') {
        reorderNeededCount++;
      }
    });

    return {
      totalStockCount,
      totalValueGhs,
      greenBatchesCount,
      yellowBatchesCount,
      redBatchesCount,
      reorderNeededCount
    };
  }, [drugs]);

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrugForBatch || !newBatchNumber || !newExpiryDate) {
      alert('Please fill in all batch details.');
      return;
    }

    const performAdd = () => {
      const newBatch: DrugBatch = {
        batchNumber: newBatchNumber.toUpperCase(),
        expiryDate: newExpiryDate,
        quantity: newQuantity,
        costPrice: newCostPrice,
        location: newLocation,
        manufacturer: newManufacturer
      };

      const updatedDrug: DrugItem = {
        ...selectedDrugForBatch,
        batches: [...selectedDrugForBatch.batches, newBatch].sort(
          (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        )
      };

      onUpdateDrug(updatedDrug);
      setSelectedDrugForBatch(null);
      setNewBatchNumber('');
      setNewExpiryDate('');
      alert(`Batch ${newBatch.batchNumber} added successfully to ${selectedDrugForBatch.brandName} with FEFO indexing.`);
    };

    // If bulk quantity > 100, enforce Superintendent PIN
    if (newQuantity > 100 && !isSuperintendentUnlocked) {
      onRequireSuperintendentPin(performAdd);
    } else {
      performAdd();
    }
  };

  const handleGeneratePurchaseOrders = () => {
    const needed = drugs
      .map(d => ({ drug: d, rop: calculateReorderPoint(d) }))
      .filter(item => item.rop.status === 'CRITICAL_REORDER' || item.rop.status === 'REORDER_RECOMMENDED');

    if (needed.length === 0) {
      alert('All stock levels are optimal. No dynamic replenishment orders required.');
      return;
    }

    let poText = `========================================================\n`;
    poText += `          DYNAMIC REPLENISHMENT PURCHASE ORDER\n`;
    poText += `          ${config.pharmacyName.toUpperCase()}\n`;
    poText += `          PO NUMBER: PO-GH-${Date.now().toString().slice(-6)}\n`;
    poText += `          DATE: ${new Date().toLocaleDateString()}\n`;
    poText += `========================================================\n`;
    poText += `RECOMMENDED DISTRIBUTORS: Ernest Chemists, Tobinco, Kinapharma\n\n`;
    poText += `ITEM DESCRIPTION               CURRENT  ROP   SUGGESTED QTY  EST. COST (GHS)\n`;
    poText += `------------------------------------------------------------------------\n`;

    let totalEstimatedGhs = 0;
    needed.forEach(({ drug, rop }) => {
      const approxCost = (drug.batches[0]?.costPrice || drug.retailPrice * 0.6) * rop.suggestedOrderQty;
      totalEstimatedGhs += approxCost;
      const desc = `${drug.brandName} (${drug.strength})`.padEnd(30, ' ');
      const cur = String(rop.currentStock).padStart(7, ' ');
      const rLevel = String(rop.reorderPoint).padStart(5, ' ');
      const sQty = String(rop.suggestedOrderQty).padStart(14, ' ');
      const costStr = approxCost.toFixed(2).padStart(15, ' ');
      poText += `${desc} ${cur} ${rLevel} ${sQty} ${costStr}\n`;
    });

    poText += `------------------------------------------------------------------------\n`;
    poText += `TOTAL ESTIMATED PURCHASE REORDER: GHS ${totalEstimatedGhs.toFixed(2)}\n`;
    poText += `SUPERINTENDENT APPROVAL: ${config.superintendentPharmacist.fullName}\n`;
    poText += `GPhC PIN: ${config.superintendentPharmacist.gphcPin}\n`;

    setGeneratedPo(poText);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Expiry & Inventory Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] text-slate-400 font-semibold block uppercase">Total Units in Stock</span>
          <span className="text-xl font-bold font-mono text-slate-100">{stats.totalStockCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] text-slate-400 font-semibold block uppercase">Stock Valuation</span>
          <span className="text-xl font-bold font-mono text-emerald-400">GHS {stats.totalValueGhs.toFixed(2)}</span>
        </div>

        {/* Green Guardrail (>6 mo) */}
        <div className="bg-emerald-950/40 border border-emerald-800/60 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-400 font-bold uppercase">&gt;6 Mo Safe Batches</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <span className="text-xl font-black font-mono text-emerald-300">{stats.greenBatchesCount}</span>
        </div>

        {/* Yellow Guardrail (3-6 mo) */}
        <div className="bg-amber-950/40 border border-amber-800/60 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-400 font-bold uppercase">3-6 Mo Markdown</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <span className="text-xl font-black font-mono text-amber-300">{stats.yellowBatchesCount}</span>
        </div>

        {/* Red Guardrail (<3 mo) Locked */}
        <div className="bg-red-950/40 border border-red-800/60 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-red-400 font-bold uppercase">&lt;3 Mo System Lock</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          </div>
          <span className="text-xl font-black font-mono text-red-300">{stats.redBatchesCount}</span>
        </div>

        {/* Reorder Alerts */}
        <div className="bg-purple-950/40 border border-purple-800/60 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-purple-300 font-bold uppercase">Reorder Alerts</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-xl font-black font-mono text-purple-200">{stats.reorderNeededCount}</span>
        </div>
      </div>

      {/* Control Bar: Filters, Search & Automated PO Generation */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search inventory by brand, generic, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
            />
          </div>

          {/* Expiry Guardrail Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterExpiry('ALL')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                filterExpiry === 'ALL' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Batches
            </button>
            <button
              onClick={() => setFilterExpiry('GREEN')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                filterExpiry === 'GREEN' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'text-emerald-500 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              &gt;6m
            </button>
            <button
              onClick={() => setFilterExpiry('YELLOW')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                filterExpiry === 'YELLOW' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'text-amber-500 hover:text-amber-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              3-6m
            </button>
            <button
              onClick={() => setFilterExpiry('RED_LOCKED')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                filterExpiry === 'RED_LOCKED' ? 'bg-red-950 text-red-400 border border-red-800' : 'text-red-500 hover:text-red-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              &lt;3m Locked
            </button>
          </div>
        </div>

        {/* PO Generator Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterReorder(filterReorder === 'ALL' ? 'REORDER_NEEDED' : 'ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              filterReorder === 'REORDER_NEEDED'
                ? 'bg-purple-950 text-purple-300 border-purple-700'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span>Low Stock Reorders Only</span>
          </button>

          <button
            onClick={handleGeneratePurchaseOrders}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Generate Dynamic PO</span>
          </button>
        </div>
      </div>

      {/* Main FEFO Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Pharmaceutical Item</th>
                <th className="p-3.5">Classification</th>
                <th className="p-3.5">FEFO Batches &amp; Expiry Dates</th>
                <th className="p-3.5 text-center">Total Stock</th>
                <th className="p-3.5 text-right">Daily Velocity</th>
                <th className="p-3.5 text-right">Dynamic ROP</th>
                <th className="p-3.5 text-center">Replenishment Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {processedDrugs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No drugs match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                processedDrugs.map((drug) => {
                  const ropInfo = calculateReorderPoint(drug);
                  return (
                    <tr key={drug.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & Strength */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-100 text-sm">{drug.brandName}</div>
                        <div className="text-[11px] text-slate-400">{drug.genericName} ({drug.strength})</div>
                        <div className="text-[10px] text-slate-500 font-mono">Barcode: {drug.barcode}</div>
                      </td>

                      {/* Classification */}
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          drug.classification === 'ClassA_Controlled'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : drug.classification === 'POM'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {drug.classification === 'ClassA_Controlled' ? 'Class A DDR' : drug.classification}
                        </span>
                      </td>

                      {/* Batches Sorted by FEFO with Color Coding */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {drug.batches.map((batch) => {
                            const evalRes = evaluateExpiryStatus(batch.expiryDate);
                            return (
                              <div
                                key={batch.batchNumber}
                                className={`px-2 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                                  evalRes.status === 'green'
                                    ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                                    : evalRes.status === 'yellow'
                                    ? 'bg-amber-950/70 border-amber-800/80 text-amber-300'
                                    : 'bg-red-950/70 border-red-800/80 text-red-400 line-through'
                                }`}
                              >
                                <span className="font-bold">{batch.batchNumber}:</span>
                                <span>{batch.quantity} units</span>
                                <span className="text-[9px] opacity-75">({batch.expiryDate})</span>
                                {evalRes.isLocked && (
                                  <span className="text-[9px] bg-red-900 text-white font-sans font-bold px-1 rounded not-italic">
                                    LOCKED
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Total Stock */}
                      <td className="p-3.5 text-center font-mono font-bold text-slate-100 text-sm">
                        {ropInfo.currentStock}
                      </td>

                      {/* Daily Velocity */}
                      <td className="p-3.5 text-right font-mono text-slate-300">
                        {drug.dailyVelocity} / day
                      </td>

                      {/* Dynamic Reorder Point */}
                      <td className="p-3.5 text-right font-mono font-semibold text-slate-200">
                        {ropInfo.reorderPoint} units
                        <span className="block text-[9px] text-slate-500 font-sans">
                          Lead Time: {drug.leadTimeDays}d
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          ropInfo.status === 'CRITICAL_REORDER'
                            ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                            : ropInfo.status === 'REORDER_RECOMMENDED'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : ropInfo.status === 'OVERSTOCKED'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {ropInfo.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedDrugForBatch(drug)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] transition-colors"
                        >
                          + New Batch
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Batch Modal */}
      {selectedDrugForBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">
                Receive New Batch: <span className="text-emerald-400">{selectedDrugForBatch.brandName}</span>
              </h3>
              <button
                onClick={() => setSelectedDrugForBatch(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Manufacturer Batch Number</label>
                <input
                  type="text"
                  placeholder="e.g. AUG-2026-X1"
                  value={newBatchNumber}
                  onChange={(e) => setNewBatchNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono uppercase focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Expiry Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Unit Cost Price (GHS)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Shelf / Warehouse Location</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Distributor / Supplier</label>
                <input
                  type="text"
                  value={newManufacturer}
                  onChange={(e) => setNewManufacturer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDrugForBatch(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow"
                >
                  Confirm Batch Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated PO Modal */}
      {generatedPo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Dynamic Replenishment Purchase Order</span>
              </h3>
              <button
                onClick={() => setGeneratedPo(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-2xl font-mono text-[11px] text-emerald-300 overflow-x-auto border border-slate-800 leading-relaxed">
              {generatedPo}
            </pre>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPo);
                  alert('Purchase Order copied to clipboard.');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([generatedPo], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `PO_Replenish_${Date.now()}.txt`;
                  a.click();
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow"
              >
                Download PO File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
