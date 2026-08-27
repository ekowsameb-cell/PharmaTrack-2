import { CounterBasketQueueItem, BasketItemWithUnit, DrugItem, DrugBatch, UnitSaleType } from '../types/pharmacy';

export const INITIAL_COUNTER_BASKETS: CounterBasketQueueItem[] = [
  {
    id: 'queue-104',
    queueNumber: 104,
    queueToken: 'Q-104',
    clerkName: 'Kwame Mensah (Counter Clerk)',
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 mins ago
    patientName: 'Abena Osei',
    patientPhone: '0244123456',
    patientGhanaCard: 'GHA-729104820-4',
    schemeType: 'PRIVATE_INSURANCE',
    insuranceProviderName: 'Nationwide Medical Insurance',
    insurancePolicyNumber: 'NW-POL-849201-B',
    clerkNotes: 'Patient complains of severe post-op pain and chest infection. Presenting private insurance card.',
    status: 'PENDING_PHARMACIST',
    targetLane: 'clinical',
    containsClassA: true,
    controlledDrugName: 'Tramadol HCl 500mg/100ml / Caps',
    prescriptionDetails: {
      prescriberName: 'Dr. K. E. Quaye, FWACS',
      prescriberMdcNumber: 'MDPC/P/2024/8492',
      prescriberHospital: '37 Military Hospital, Accra',
      prescriptionDate: new Date().toISOString().split('T')[0],
      diagnosisIcd10: 'M54.5 (Acute Severe Lumbar Pain) + J06.9 (Acute RTI)',
      clinicalNotes: 'Tramadol 50mg caps 1 TDS x 5 days + Amoxicap 500mg 1 TDS x 7 days'
    },
    items: [
      {
        id: 'item-1',
        drug: {
          id: 'drug-amoxicillin-500',
          brandName: 'Amoxicap 500mg',
          genericName: 'Amoxicillin Trihydrate',
          dosageForm: 'Capsule',
          strength: '500mg',
          barcode: '603400192801',
          category: 'Antibiotics',
          classification: 'POM',
          retailPrice: 90.00,
          nhisTariffPrice: 48.00,
          nhisCovered: true,
          nhisCode: 'NHIA-MED-AMX500',
          batches: [
            {
              batchNumber: 'AMX-2026-08',
              expiryDate: '2028-06-30',
              quantity: 42,
              costPrice: 55.00,
              location: 'Aisle 2 - Shelf B (Antibio)',
              manufacturer: 'Ernest Chemists Ltd, Ghana'
            }
          ],
          reorderLevel: 20,
          dailyVelocity: 6,
          leadTimeDays: 3,
          packSize: 10,
          unit: 'Box (10 Capsules)'
        },
        selectedBatch: {
          batchNumber: 'AMX-2026-08',
          expiryDate: '2028-06-30',
          quantity: 42,
          costPrice: 55.00,
          location: 'Aisle 2 - Shelf B (Antibio)',
          manufacturer: 'Ernest Chemists Ltd, Ghana'
        },
        quantity: 2,
        saleUnit: 'box',
        unitsPerPack: 10,
        unitPriceGhs: 45.00,
        totalPriceGhs: 90.00,
        expirySafe: true,
        expiryDate: '2028-06-30'
      },
      {
        id: 'item-2',
        drug: {
          id: 'drug-tramadol-500',
          brandName: 'Tramadol Hydrochloride (Class A)',
          genericName: 'Tramadol HCl',
          dosageForm: 'Capsule',
          strength: '50mg',
          barcode: '603400812903',
          category: 'Narcotic / Controlled Analgesic',
          classification: 'ClassA_Controlled',
          retailPrice: 120.00,
          nhisTariffPrice: 0.00,
          nhisCovered: false,
          batches: [
            {
              batchNumber: 'TRM-GH-2026-04',
              expiryDate: '2027-11-30',
              quantity: 14,
              costPrice: 70.00,
              location: 'Dangerous Drugs Safe #1 (Locked)',
              manufacturer: 'Sanofi / Ernest Chemists'
            }
          ],
          reorderLevel: 10,
          dailyVelocity: 2,
          leadTimeDays: 5,
          packSize: 20,
          unit: 'Box (20 Caps)'
        },
        selectedBatch: {
          batchNumber: 'TRM-GH-2026-04',
          expiryDate: '2027-11-30',
          quantity: 14,
          costPrice: 70.00,
          location: 'Dangerous Drugs Safe #1 (Locked)',
          manufacturer: 'Sanofi / Ernest Chemists'
        },
        quantity: 1,
        saleUnit: 'box',
        unitsPerPack: 20,
        unitPriceGhs: 120.00,
        totalPriceGhs: 120.00,
        expirySafe: true,
        expiryDate: '2027-11-30',
        requiresDoctorMdc: true
      }
    ]
  },
  {
    id: 'queue-102',
    queueNumber: 102,
    queueToken: 'Q-102',
    clerkName: 'Kwame Mensah (Counter Clerk)',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    patientName: 'Kofi Asare (Walk-in)',
    patientPhone: '0208129402',
    schemeType: 'CASH',
    clerkNotes: 'Customer requested quick pain relief for toothache and multivitamins.',
    status: 'PENDING_CASHIER',
    targetLane: 'retail',
    containsClassA: false,
    pharmacistReview: {
      reviewedBy: 'Pharm. Dr. Araba Mensah',
      reviewedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      gphcPin: 'PC-GH-03912',
      clinicalApproved: true,
      itemBillingMatrix: [
        {
          drugId: 'drug-paracetamol-500',
          drugName: 'Paracetamol 500mg (M&G Loose)',
          basePrice: 15.00,
          insurerPays: 0.00,
          patientCopay: 15.00,
          status: 'APPROVED'
        },
        {
          drugId: 'drug-multivit',
          drugName: 'Wellwoman / Wellman Multivitamins',
          basePrice: 85.00,
          insurerPays: 0.00,
          patientCopay: 85.00,
          status: 'APPROVED'
        }
      ],
      totalBasePrice: 100.00,
      totalInsurerPays: 0.00,
      totalPatientCopay: 100.00
    },
    items: [
      {
        id: 'item-102-1',
        drug: {
          id: 'drug-paracetamol-500',
          brandName: 'Paracetamol 500mg Tablets',
          genericName: 'Acetaminophen / Paracetamol',
          dosageForm: 'Tablet',
          strength: '500mg',
          barcode: '603400192802',
          category: 'Analgesics / OTC',
          classification: 'OTC',
          retailPrice: 0.50,
          nhisTariffPrice: 0.20,
          nhisCovered: true,
          batches: [
            {
              batchNumber: 'PARA-2026-09',
              expiryDate: '2028-12-31',
              quantity: 1200,
              costPrice: 0.15,
              location: 'Counter Drawer 1 (OTC)',
              manufacturer: 'M&G Pharmaceuticals Ltd'
            }
          ],
          reorderLevel: 300,
          dailyVelocity: 45,
          leadTimeDays: 2,
          packSize: 1000,
          unit: 'Loose Tablets'
        },
        selectedBatch: {
          batchNumber: 'PARA-2026-09',
          expiryDate: '2028-12-31',
          quantity: 1200,
          costPrice: 0.15,
          location: 'Counter Drawer 1 (OTC)',
          manufacturer: 'M&G Pharmaceuticals Ltd'
        },
        quantity: 30,
        saleUnit: 'tablet',
        unitsPerPack: 1000,
        unitPriceGhs: 0.50,
        totalPriceGhs: 15.00,
        expirySafe: true,
        expiryDate: '2028-12-31'
      },
      {
        id: 'item-102-2',
        drug: {
          id: 'drug-multivit',
          brandName: 'Vitabiotics Wellman Original',
          genericName: 'Multivitamins + Ginseng + Co-Q10',
          dosageForm: 'Tablet',
          strength: 'Standard',
          barcode: '502126522001',
          category: 'Wellness & Supplements',
          classification: 'OTC',
          retailPrice: 85.00,
          nhisTariffPrice: 0.00,
          nhisCovered: false,
          batches: [
            {
              batchNumber: 'WMAN-2026-01',
              expiryDate: '2028-04-30',
              quantity: 28,
              costPrice: 58.00,
              location: 'Shelf C - Front OTC Display',
              manufacturer: 'Vitabiotics UK / Ernest Chemists'
            }
          ],
          reorderLevel: 10,
          dailyVelocity: 3,
          leadTimeDays: 4,
          packSize: 30,
          unit: 'Pack of 30'
        },
        selectedBatch: {
          batchNumber: 'WMAN-2026-01',
          expiryDate: '2028-04-30',
          quantity: 28,
          costPrice: 58.00,
          location: 'Shelf C - Front OTC Display',
          manufacturer: 'Vitabiotics UK / Ernest Chemists'
        },
        quantity: 1,
        saleUnit: 'box',
        unitsPerPack: 30,
        unitPriceGhs: 85.00,
        totalPriceGhs: 85.00,
        expirySafe: true,
        expiryDate: '2028-04-30'
      }
    ]
  },
  {
    id: 'queue-105',
    queueNumber: 105,
    queueToken: 'Q-105',
    clerkName: 'Kwame Mensah (Counter Clerk)',
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    patientName: 'Kwadwo Frimpong (NHIS Walk-In)',
    patientPhone: '0559102834',
    patientGhanaCard: 'GHA-849102948-1',
    schemeType: 'NHIS',
    insurancePolicyNumber: 'NHIS-94820194',
    clerkNotes: 'NHIS card verified active. Diagnosed with uncomplicated Malaria. Co-artemether 80/480mg.',
    status: 'PENDING_PHARMACIST',
    targetLane: 'clinical',
    containsClassA: false,
    prescriptionDetails: {
      prescriberName: 'Dr. Mercy Acheampong, MBChB',
      prescriberMdcNumber: 'MDC/RN/44102',
      prescriberHospital: 'Ridge Regional Hospital, Accra',
      prescriptionDate: new Date().toISOString().split('T')[0],
      diagnosisIcd10: 'B54 (Uncomplicated Malaria)',
      clinicalNotes: 'Artemether + Lumefantrine 80/480mg 1 BD x 3 days with fatty meal'
    },
    items: [
      {
        id: 'item-105-1',
        drug: {
          id: 'drug-angel-malar',
          brandName: 'Angel Malar 80/480mg (ACT)',
          genericName: 'Artemether + Lumefantrine',
          dosageForm: 'Tablet',
          strength: '80/480mg',
          barcode: '603400392810',
          category: 'Antimalarials',
          classification: 'POM',
          retailPrice: 65.00,
          nhisTariffPrice: 42.00,
          nhisCovered: true,
          nhisCode: 'NHIA-MED-ART480',
          batches: [
            {
              batchNumber: 'ANG-2026-03',
              expiryDate: '2028-08-31',
              quantity: 85,
              costPrice: 32.00,
              location: 'Aisle 1 - Shelf A (Antimalarials)',
              manufacturer: 'Tobinco Pharmaceuticals Ltd'
            }
          ],
          reorderLevel: 30,
          dailyVelocity: 12,
          leadTimeDays: 2,
          packSize: 6,
          unit: 'Pack of 6'
        },
        selectedBatch: {
          batchNumber: 'ANG-2026-03',
          expiryDate: '2028-08-31',
          quantity: 85,
          costPrice: 32.00,
          location: 'Aisle 1 - Shelf A (Antimalarials)',
          manufacturer: 'Tobinco Pharmaceuticals Ltd'
        },
        quantity: 1,
        saleUnit: 'box',
        unitsPerPack: 6,
        unitPriceGhs: 42.00,
        totalPriceGhs: 42.00,
        expirySafe: true,
        expiryDate: '2028-08-31'
      }
    ]
  }
];

const QUEUE_STORAGE_KEY = 'pharmatrack_gh_queue_v1';

export function getStoredBasketQueue(): CounterBasketQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load basket queue', e);
  }
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(INITIAL_COUNTER_BASKETS));
  return INITIAL_COUNTER_BASKETS;
}

export function saveStoredBasketQueue(queue: CounterBasketQueueItem[]): void {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}
