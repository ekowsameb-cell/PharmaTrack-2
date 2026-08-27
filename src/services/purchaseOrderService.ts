import { PurchaseOrder, PurchaseOrderItem } from '../types/pharmacy';

export const PO_OWNER_THRESHOLD_GHS = 5000.00;

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-8902',
    supplierName: 'Ernest Chemists Ltd (Industrial Area, Accra)',
    supplierCode: 'SUP-ERNEST-GH',
    requestedBy: 'Pharm. Dr. Araba Mensah (Superintendent)',
    createdAt: '2026-08-25T14:30:00.000Z',
    items: [
      {
        drugId: 'drug-amoxicap-500',
        drugName: 'Amoxicillin 500mg',
        brandName: 'Amoxicap (Box of 100)',
        requestedQuantityPacks: 50,
        packSize: 100,
        unitCostGhs: 240.00,
        totalCostGhs: 12000.00
      },
      {
        drugId: 'drug-cipro-500',
        drugName: 'Ciprofloxacin 500mg',
        brandName: 'Cipro-Denk (Box of 10)',
        requestedQuantityPacks: 80,
        packSize: 10,
        unitCostGhs: 80.00,
        totalCostGhs: 6400.00
      }
    ],
    totalCostGhs: 18400.00,
    requiresOwnerApproval: true,
    thresholdGhs: PO_OWNER_THRESHOLD_GHS,
    status: 'PENDING_OWNER_APPROVAL'
  },
  {
    id: 'PO-8903',
    supplierName: 'Tobinco Pharmaceuticals Ltd (Kotobabi, Accra)',
    supplierCode: 'SUP-TOBINCO-GH',
    requestedBy: 'Kofi Boateng Jr. (Inventory Officer)',
    createdAt: '2026-08-26T08:15:00.000Z',
    items: [
      {
        drugId: 'drug-angel-malar',
        drugName: 'Artemether + Lumefantrine 80/480mg',
        brandName: 'Angel Malar (Pack of 6)',
        requestedQuantityPacks: 200,
        packSize: 6,
        unitCostGhs: 46.00,
        totalCostGhs: 9200.00
      }
    ],
    totalCostGhs: 9200.00,
    requiresOwnerApproval: true,
    thresholdGhs: PO_OWNER_THRESHOLD_GHS,
    status: 'PENDING_OWNER_APPROVAL'
  },
  {
    id: 'PO-8904',
    supplierName: 'Kojach Pharma Ltd (Spintex Road, Accra)',
    supplierCode: 'SUP-KOJACH-GH',
    requestedBy: 'Kwame Mensah (Counter Clerk)',
    createdAt: '2026-08-26T09:40:00.000Z',
    items: [
      {
        drugId: 'drug-paracetamol-syrup',
        drugName: 'Paracetamol Paediatric 120mg/5ml',
        brandName: 'M&G Para-Junior (100ml)',
        requestedQuantityPacks: 150,
        packSize: 1,
        unitCostGhs: 23.00,
        totalCostGhs: 3450.00
      }
    ],
    totalCostGhs: 3450.00,
    requiresOwnerApproval: false,
    thresholdGhs: PO_OWNER_THRESHOLD_GHS,
    status: 'APPROVED_SENT_TO_SUPPLIER',
    approvedBy: 'Auto-Approved (Under GHS 5,000 Limit)',
    approvedAt: '2026-08-26T09:40:00.000Z'
  },
  {
    id: 'PO-8898',
    supplierName: 'M&G Pharmaceuticals Ltd (Dzorwulu, Accra)',
    supplierCode: 'SUP-MG-PHARMA',
    requestedBy: 'Pharm. Dr. Araba Mensah',
    createdAt: '2026-08-22T10:00:00.000Z',
    items: [
      {
        drugId: 'drug-ors-zinc',
        drugName: 'Oral Rehydration Salts + Zinc',
        brandName: 'M&G Oralyte-Z (Box of 20)',
        requestedQuantityPacks: 100,
        packSize: 20,
        unitCostGhs: 35.00,
        totalCostGhs: 3500.00
      }
    ],
    totalCostGhs: 3500.00,
    requiresOwnerApproval: false,
    thresholdGhs: PO_OWNER_THRESHOLD_GHS,
    status: 'DELIVERED',
    approvedBy: 'Auto-Approved',
    approvedAt: '2026-08-22T10:00:00.000Z'
  }
];

const PO_STORAGE_KEY = 'pharmatrack_gh_po_v1';

export function getStoredPurchaseOrders(): PurchaseOrder[] {
  try {
    const raw = localStorage.getItem(PO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load purchase orders', e);
  }
  localStorage.setItem(PO_STORAGE_KEY, JSON.stringify(INITIAL_PURCHASE_ORDERS));
  return INITIAL_PURCHASE_ORDERS;
}

export function saveStoredPurchaseOrders(pos: PurchaseOrder[]): void {
  localStorage.setItem(PO_STORAGE_KEY, JSON.stringify(pos));
}
