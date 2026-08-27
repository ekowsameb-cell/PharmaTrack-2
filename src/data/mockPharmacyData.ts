import { DrugItem, PatientProfile, PrivateInsurer, PharmacyConfig, TransactionRecord } from '../types/pharmacy';

// Helper function to calculate date offset from current date
const getDateOffset = (months: number, days: number = 0): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// Helper function to get past ISO timestamp
const getPastIsoTimestamp = (daysAgo: number, hour: number = 10, min: number = 30): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};


export const INITIAL_PHARMACY_CONFIG: PharmacyConfig = {
  pharmacyName: 'PharmaTrack Community Chemist',
  branchName: 'Osu Oxford Street Main Branch',
  location: 'Plot 42, Oxford Street, Osu, Accra, Ghana',
  phone: '+233 30 278 4920 / +233 24 412 3456',
  email: 'dispensary@pharmatrack.gh',
  graTin: 'C0004928172X',
  gphcLicenseNumber: 'GPhC/RET/GAR/2026/0842',
  nhiaFacilityCode: 'NHIA-FAC-GAR-0482',
  superintendentPharmacist: {
    fullName: 'Pharm. Dr. Kwabena Mensah-Bonsu, PharmD, MPSGH',
    gphcPin: 'PC-GH-03912',
    authPin: '9999'
  },
  momoMerchantAccounts: {
    mtnMerchantId: 'MOMO-GH-94821',
    telecelMerchantId: 'TCEL-MER-30219',
    atMoneyMerchantId: 'ATM-MER-11942'
  },
  ghqrTerminalId: 'GHIPSS-TERM-ACC-042',
  vatRate: 15.0,
  nhilRate: 2.5,
  getfundRate: 2.5,
  covidRate: 1.0,
  isOnlineMode: true
};

export const INITIAL_PRIVATE_INSURERS: PrivateInsurer[] = [
  {
    id: 'ins-acacia',
    name: 'Acacia Health Insurance',
    code: 'ACACIA-GH',
    defaultCopayPercentage: 10, // 90% covered, 10% patient copay
    coversOtc: false,
    monthlyLimitGhs: 15000,
    contactPerson: 'Abena Osei',
    contactPhone: '+233 30 221 4400',
    portalUrl: 'https://claims.acaciahealth.com.gh',
    outstandingBalance: 14250.80,
    claimsCount: 42
  },
  {
    id: 'ins-apex',
    name: 'Apex Health Insurance',
    code: 'APEX-GH',
    defaultCopayPercentage: 20, // 80% covered, 20% patient copay
    coversOtc: false,
    monthlyLimitGhs: 20000,
    contactPerson: 'Ebenezer Quaye',
    contactPhone: '+233 30 274 0880',
    portalUrl: 'https://provider.apexhealthghana.com',
    outstandingBalance: 28400.00,
    claimsCount: 89
  },
  {
    id: 'ins-cosmo',
    name: 'Cosmopolitan Health Insurance',
    code: 'COSMO-GH',
    defaultCopayPercentage: 15,
    coversOtc: true,
    monthlyLimitGhs: 18000,
    contactPerson: 'Kofi Boakye',
    contactPhone: '+233 30 225 1800',
    portalUrl: 'https://claims.cosmohealth.net',
    outstandingBalance: 19820.50,
    claimsCount: 54
  },
  {
    id: 'ins-nationwide',
    name: 'Nationwide Medical Insurance',
    code: 'NW-GH',
    defaultCopayPercentage: 10,
    coversOtc: false,
    monthlyLimitGhs: 25000,
    contactPerson: 'Gifty Addo',
    contactPhone: '+233 30 222 3344',
    portalUrl: 'https://nationwidemutual.com.gh',
    outstandingBalance: 34100.20,
    claimsCount: 112
  },
  {
    id: 'ins-metropolitan',
    name: 'Metropolitan Health Insurance',
    code: 'MET-GH',
    defaultCopayPercentage: 20,
    coversOtc: false,
    monthlyLimitGhs: 12000,
    contactPerson: 'Samuel Tetteh',
    contactPhone: '+233 30 263 3933',
    portalUrl: 'https://metropolitan.com.gh',
    outstandingBalance: 9600.00,
    claimsCount: 28
  },
  {
    id: 'ins-premier',
    name: 'Premier Health Insurance',
    code: 'PREMIER-GH',
    defaultCopayPercentage: 0, // 100% covered tier
    coversOtc: false,
    monthlyLimitGhs: 22000,
    contactPerson: 'Jessica Arthur',
    contactPhone: '+233 30 290 1234',
    portalUrl: 'https://premierhealthinsurancegh.com',
    outstandingBalance: 16750.40,
    claimsCount: 47
  }
];

export const INITIAL_DRUG_ITEMS: DrugItem[] = [
  // 1. Amoxicillin / Clavulanate (Augmentin) - POM Antibiotic
  {
    id: 'drug-01',
    brandName: 'Augmentin 625mg',
    genericName: 'Amoxicillin + Clavulanic Acid',
    dosageForm: 'Tablet',
    strength: '500mg/125mg',
    barcode: '6001234567890',
    category: 'Antibiotics',
    classification: 'POM',
    retailPrice: 85.00,
    nhisTariffPrice: 42.50,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-AUG625',
    packSize: 14,
    unit: 'Strip of 14',
    reorderLevel: 25,
    dailyVelocity: 4.2,
    leadTimeDays: 5,
    description: 'Broad spectrum beta-lactamase inhibitor antibacterial for RTI and soft tissue infections.',
    activeIngredients: 'Amoxicillin Trihydrate 500mg, Potassium Clavulanate 125mg',
    batches: [
      {
        batchNumber: 'AUG-24B01',
        expiryDate: getDateOffset(9), // Green (>6 mo)
        quantity: 48,
        costPrice: 55.00,
        location: 'Aisle B1-Shelf 2',
        manufacturer: 'GSK / Ernest Chemists Ltd'
      },
      {
        batchNumber: 'AUG-23K18',
        expiryDate: getDateOffset(4), // Yellow (3-6 mo)
        quantity: 12,
        costPrice: 50.00,
        location: 'Aisle B1-Shelf 1',
        manufacturer: 'GSK / Ernest Chemists Ltd'
      }
    ]
  },

  // 2. Coartem 80/480 (Antimalarial - High Velocity in Ghana)
  {
    id: 'drug-02',
    brandName: 'Coartem 80/480mg Forte',
    genericName: 'Artemether + Lumefantrine',
    dosageForm: 'Tablet',
    strength: '80mg/480mg',
    barcode: '6009876543210',
    category: 'Antimalarials',
    classification: 'POM',
    retailPrice: 45.00,
    nhisTariffPrice: 28.00,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-AL80480',
    packSize: 6,
    unit: 'Pack of 6',
    reorderLevel: 40,
    dailyVelocity: 8.5,
    leadTimeDays: 3,
    description: 'First-line ACT for uncomplicated Plasmodium falciparum malaria in Ghana.',
    activeIngredients: 'Artemether 80mg, Lumefantrine 480mg',
    batches: [
      {
        batchNumber: 'COA-884A',
        expiryDate: getDateOffset(14), // Green
        quantity: 110,
        costPrice: 28.00,
        location: 'Aisle A1-Shelf 1',
        manufacturer: 'Novartis Pharma / Tobinco'
      },
      {
        batchNumber: 'COA-772D',
        expiryDate: getDateOffset(5), // Yellow
        quantity: 18,
        costPrice: 26.00,
        location: 'Aisle A1-Shelf 1',
        manufacturer: 'Novartis Pharma / Tobinco'
      }
    ]
  },

  // 3. Tramadol Hydrochloride 100mg - CLASS A CONTROLLED DRUG (GPhC Regulated)
  {
    id: 'drug-03',
    brandName: 'Tramal Retard 100mg',
    genericName: 'Tramadol Hydrochloride',
    dosageForm: 'Extended Release Tablet',
    strength: '100mg',
    barcode: '6004928174921',
    category: 'Opioid Analgesics',
    classification: 'ClassA_Controlled',
    retailPrice: 65.00,
    nhisTariffPrice: 32.00,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-TRAM100',
    packSize: 10,
    unit: 'Blister of 10',
    reorderLevel: 15,
    dailyVelocity: 1.2,
    leadTimeDays: 7,
    description: 'Centrally acting opioid analgesic. GPhC Class A Dangerous Drug Register strictly mandatory.',
    activeIngredients: 'Tramadol Hydrochloride 100mg',
    batches: [
      {
        batchNumber: 'TRM-2024-X9',
        expiryDate: getDateOffset(11), // Green
        quantity: 35,
        costPrice: 38.00,
        location: 'Controlled Drugs Safe (Cabinet S-1)',
        manufacturer: 'Grünenthal / Kinapharma'
      },
      {
        batchNumber: 'TRM-2023-M4',
        expiryDate: getDateOffset(4, 10), // Yellow (3-6 mo)
        quantity: 6,
        costPrice: 35.00,
        location: 'Controlled Drugs Safe (Cabinet S-1)',
        manufacturer: 'Grünenthal / Kinapharma'
      }
    ]
  },

  // 4. Pethidine Injection 100mg/2ml - CLASS A CONTROLLED DRUG
  {
    id: 'drug-04',
    brandName: 'Pethidine Ampoules 100mg/2ml',
    genericName: 'Pethidine Hydrochloride',
    dosageForm: 'Injection (Ampoule)',
    strength: '50mg/ml (2ml)',
    barcode: '6008472910394',
    category: 'Narcotic Analgesics',
    classification: 'ClassA_Controlled',
    retailPrice: 120.00,
    nhisTariffPrice: 65.00,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-PETH100',
    packSize: 5,
    unit: 'Pack of 5 Ampoules',
    reorderLevel: 8,
    dailyVelocity: 0.4,
    leadTimeDays: 10,
    description: 'Schedule narcotic analgesic. Strict Superintendent Pharmacist override & DDR recording.',
    activeIngredients: 'Pethidine HCl 100mg/2ml',
    batches: [
      {
        batchNumber: 'PTH-GH-991',
        expiryDate: getDateOffset(18), // Green
        quantity: 16,
        costPrice: 75.00,
        location: 'Superintendent Narcotic Vault',
        manufacturer: 'Martindale Pharma'
      }
    ]
  },

  // 5. Metformin 500mg (Chronic NCD - Diabetes)
  {
    id: 'drug-05',
    brandName: 'Glucophage 500mg',
    genericName: 'Metformin Hydrochloride',
    dosageForm: 'Tablet',
    strength: '500mg',
    barcode: '6007482910482',
    category: 'Antidiabetic Agents',
    classification: 'POM',
    retailPrice: 32.00,
    nhisTariffPrice: 16.50,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-MET500',
    packSize: 50,
    unit: 'Box of 50',
    reorderLevel: 30,
    dailyVelocity: 5.8,
    leadTimeDays: 4,
    description: 'Biguanide antihyperglycemic agent for Type 2 Diabetes Mellitus management.',
    activeIngredients: 'Metformin Hydrochloride 500mg',
    batches: [
      {
        batchNumber: 'MET-24-402',
        expiryDate: getDateOffset(16), // Green
        quantity: 80,
        costPrice: 18.00,
        location: 'Aisle C2-Shelf 3',
        manufacturer: 'Merck Healthcare / Letap'
      },
      {
        batchNumber: 'MET-23-118',
        expiryDate: getDateOffset(1, 15), // Red (<3 mo EXPIRED/NEAR-EXPIRY LOCK)
        quantity: 14,
        costPrice: 15.00,
        location: 'Quarantine Expiry Bin (Shelf Q)',
        manufacturer: 'Merck Healthcare / Letap'
      }
    ]
  },

  // 6. Amlodipine 10mg (Chronic NCD - Hypertension)
  {
    id: 'drug-06',
    brandName: 'Norvasc 10mg',
    genericName: 'Amlodipine Besylate',
    dosageForm: 'Tablet',
    strength: '10mg',
    barcode: '6003928174920',
    category: 'Antihypertensives',
    classification: 'POM',
    retailPrice: 48.00,
    nhisTariffPrice: 24.00,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-AML10',
    packSize: 30,
    unit: 'Box of 30',
    reorderLevel: 25,
    dailyVelocity: 3.9,
    leadTimeDays: 4,
    description: 'Dihydropyridine calcium channel blocker for essential hypertension and angina.',
    activeIngredients: 'Amlodipine Besylate 10mg',
    batches: [
      {
        batchNumber: 'AML-092K',
        expiryDate: getDateOffset(12), // Green
        quantity: 65,
        costPrice: 28.00,
        location: 'Aisle C1-Shelf 2',
        manufacturer: 'Pfizer / Ayrton Drugs'
      }
    ]
  },

  // 7. Paracetamol 500mg (Fast-moving OTC)
  {
    id: 'drug-07',
    brandName: 'Panadol Extra',
    genericName: 'Paracetamol + Caffeine',
    dosageForm: 'Caplet',
    strength: '500mg/65mg',
    barcode: '6001112223334',
    category: 'Analgesics & Antipyretics',
    classification: 'OTC',
    retailPrice: 15.00,
    nhisTariffPrice: 6.00,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-PCM500',
    packSize: 20,
    unit: 'Pack of 20',
    reorderLevel: 50,
    dailyVelocity: 14.2,
    leadTimeDays: 2,
    description: 'Fast acting pain relief and fever reducer for front-of-counter retail lane.',
    activeIngredients: 'Paracetamol 500mg, Caffeine 65mg',
    batches: [
      {
        batchNumber: 'PAN-2024-88',
        expiryDate: getDateOffset(20), // Green
        quantity: 240,
        costPrice: 8.50,
        location: 'Front Counter OTC Display 1',
        manufacturer: 'Haleon / Ernest Chemists'
      },
      {
        batchNumber: 'PAN-2023-41',
        expiryDate: getDateOffset(5, 5), // Yellow (3-6 mo)
        quantity: 30,
        costPrice: 7.50,
        location: 'Front Counter OTC Display 1',
        manufacturer: 'Haleon / Ernest Chemists'
      }
    ]
  },

  // 8. Wellman / Wellwoman Multivitamin (100% Cash/OTC Non-NHIS item)
  {
    id: 'drug-08',
    brandName: 'Wellman Original Multi-Nutrients',
    genericName: 'Comprehensive Multivitamins + Ginseng + Co-Q10',
    dosageForm: 'Capsule',
    strength: '30 Advanced Nutrients',
    barcode: '5021265220448',
    category: 'Supplements & Wellness',
    classification: 'OTC',
    retailPrice: 145.00,
    nhisTariffPrice: 0.00,
    nhisCovered: false,
    packSize: 30,
    unit: 'Box of 30',
    reorderLevel: 12,
    dailyVelocity: 2.1,
    leadTimeDays: 6,
    description: 'Premium men health multivitamin. 100% out-of-pocket patient retail payment.',
    activeIngredients: 'Vitamin A, C, D, E, Zinc, Selenium, Korean Ginseng, L-Carnitine',
    batches: [
      {
        batchNumber: 'VIT-94821',
        expiryDate: getDateOffset(15), // Green
        quantity: 34,
        costPrice: 98.00,
        location: 'OTC Wellness Bay 2',
        manufacturer: 'Vitabiotics UK'
      }
    ]
  },

  // 9. Ciprofloxacin 500mg (POM Antibiotic)
  {
    id: 'drug-09',
    brandName: 'Cipro-Denk 500',
    genericName: 'Ciprofloxacin Hydrochloride',
    dosageForm: 'Film-coated Tablet',
    strength: '500mg',
    barcode: '6004928173829',
    category: 'Antibiotics',
    classification: 'POM',
    retailPrice: 40.00,
    nhisTariffPrice: 20.00,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-CIP500',
    packSize: 10,
    unit: 'Blister of 10',
    reorderLevel: 20,
    dailyVelocity: 3.1,
    leadTimeDays: 4,
    description: 'Fluoroquinolone antibacterial agent for severe bacterial infections.',
    activeIngredients: 'Ciprofloxacin 500mg',
    batches: [
      {
        batchNumber: 'CIP-24-A01',
        expiryDate: getDateOffset(10), // Green
        quantity: 52,
        costPrice: 22.00,
        location: 'Aisle B2-Shelf 1',
        manufacturer: 'Denk Pharma Germany'
      }
    ]
  },

  // 10. Omeprazole 20mg (Gastrointestinal - POM)
  {
    id: 'drug-10',
    brandName: 'Omez 20mg Capsules',
    genericName: 'Omeprazole',
    dosageForm: 'Capsule',
    strength: '20mg',
    barcode: '6008492019482',
    category: 'Gastrointestinal',
    classification: 'POM',
    retailPrice: 25.00,
    nhisTariffPrice: 12.00,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-OME20',
    packSize: 20,
    unit: 'Pack of 20',
    reorderLevel: 25,
    dailyVelocity: 4.5,
    leadTimeDays: 3,
    description: 'Proton pump inhibitor (PPI) for peptic ulcer and GERD therapy.',
    activeIngredients: 'Omeprazole enteric-coated pellets 20mg',
    batches: [
      {
        batchNumber: 'OMZ-8831',
        expiryDate: getDateOffset(8), // Green
        quantity: 75,
        costPrice: 13.50,
        location: 'Aisle A2-Shelf 3',
        manufacturer: 'Dr. Reddys Labs'
      }
    ]
  },

  // 11. Dextromethorphan / Codeine Cough Linctus (Class B Controlled)
  {
    id: 'drug-11',
    brandName: 'Benylin with Codeine Adult Linctus',
    genericName: 'Codeine Phosphate + Diphenhydramine',
    dosageForm: 'Syrup / Linctus',
    strength: '10mg/5ml',
    barcode: '6003928174019',
    category: 'Respiratory',
    classification: 'ClassB_Controlled',
    retailPrice: 55.00,
    nhisTariffPrice: 26.00,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-COD10',
    packSize: 100,
    unit: 'Bottle 100ml',
    reorderLevel: 15,
    dailyVelocity: 1.8,
    leadTimeDays: 5,
    description: 'Cough suppressant with mild opioid codeine. Regulated under GPhC dispenser supervision.',
    activeIngredients: 'Codeine Phosphate 10mg, Diphenhydramine HCl 14mg / 5ml',
    batches: [
      {
        batchNumber: 'BEN-2024-K2',
        expiryDate: getDateOffset(13), // Green
        quantity: 28,
        costPrice: 32.00,
        location: 'Aisle B3-Shelf 1',
        manufacturer: 'Johnson & Johnson / Kofikrom'
      }
    ]
  },

  // 12. Oral Rehydration Salts (ORS) + Zinc
  {
    id: 'drug-12',
    brandName: 'ORS Sachet + Zinc 20mg Kit',
    genericName: 'Oral Rehydration Salts + Zinc Sulphate',
    dosageForm: 'Powder Sachet + Dispersible Tablet',
    strength: 'WHO Low Osmolarity Form',
    barcode: '6001928374650',
    category: 'Electrolytes & Nutrition',
    classification: 'OTC',
    retailPrice: 12.00,
    nhisTariffPrice: 5.50,
    nhisCovered: true,
    nhisCode: 'NHIS-MED-ORSZINC',
    packSize: 5,
    unit: 'Kit (2 sachets + 10 tabs)',
    reorderLevel: 30,
    dailyVelocity: 6.2,
    leadTimeDays: 2,
    description: 'First-line pediatric and adult rehydration management for diarrhoeal illness.',
    activeIngredients: 'Sodium Chloride, Glucose, Potassium, Zinc Sulphate 20mg',
    batches: [
      {
        batchNumber: 'ORS-24-99',
        expiryDate: getDateOffset(22), // Green
        quantity: 140,
        costPrice: 6.00,
        location: 'OTC Front Shelf 2',
        manufacturer: 'Kinapharma Ltd Ghana'
      }
    ]
  }
];

export const INITIAL_PATIENT_PROFILES: PatientProfile[] = [
  {
    id: 'pat-001',
    fullName: 'Kofi Mensah Boateng',
    phone: '+233 24 498 7654',
    nationalId: 'GHA-729481029-4',
    age: 48,
    gender: 'M',
    nhisNumber: 'NHIS-84920194',
    nhisStatus: 'Active',
    nhisExpiry: getDateOffset(10),
    nhisCategory: 'SSNIT',
    privateInsuranceProvider: 'Acacia Health Insurance',
    privatePolicyNumber: 'ACA-POL-984210',
    allergies: ['Penicillin', 'Sulphonamides'],
    chronicConditions: ['Hypertension', 'Dyslipidemia']
  },
  {
    id: 'pat-002',
    fullName: 'Akua Serwaa Dankwa',
    phone: '+233 50 123 4567',
    nationalId: 'GHA-394810294-8',
    age: 32,
    gender: 'F',
    nhisNumber: 'NHIS-93820192',
    nhisStatus: 'Active',
    nhisExpiry: getDateOffset(6),
    nhisCategory: 'Pregnant',
    privateInsuranceProvider: 'Apex Health Insurance',
    privatePolicyNumber: 'APX-2026-4491',
    allergies: ['NSAIDs'],
    chronicConditions: ['Asthma']
  },
  {
    id: 'pat-003',
    fullName: 'Kwame Osei-Tutu',
    phone: '+233 55 987 6543',
    nationalId: 'GHA-102938475-1',
    age: 62,
    gender: 'M',
    nhisNumber: 'NHIS-11223344',
    nhisStatus: 'Active',
    nhisExpiry: getDateOffset(12),
    nhisCategory: 'SSNIT',
    privateInsuranceProvider: 'Nationwide Medical Insurance',
    privatePolicyNumber: 'NW-EXEC-00492',
    allergies: [],
    chronicConditions: ['Type 2 Diabetes', 'Hypertension', 'Osteoarthritis']
  },
  {
    id: 'pat-004',
    fullName: 'Ama Pokuaa Frimpong',
    phone: '+233 27 765 4321',
    nationalId: 'GHA-849201934-2',
    age: 26,
    gender: 'F',
    nhisNumber: 'NHIS-55667788',
    nhisStatus: 'Active',
    nhisExpiry: getDateOffset(4),
    nhisCategory: 'Informal',
    privateInsuranceProvider: 'Cosmopolitan Health Insurance',
    privatePolicyNumber: 'CSM-IND-8842',
    allergies: ['Ciprofloxacin'],
    chronicConditions: []
  }
];

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  // Transaction 1: Today - Malaria + Antibiotic (SSNIT)
  {
    id: 'TXN-GH-948201-1',
    sequenceNumber: 1,
    timestamp: getPastIsoTimestamp(0, 9, 15),
    lane: 'clinical',
    patient: INITIAL_PATIENT_PROFILES[0],
    prescription: {
      prescriberName: 'Dr. Michael K. Mensah',
      prescriberMdcNumber: 'MDC/RN/39482',
      prescriberHospital: 'Korle-Bu Teaching Hospital',
      prescriptionDate: getPastIsoTimestamp(0, 8, 30).split('T')[0],
      diagnosisIcd10: 'B54 (Unspecified Malaria)',
      clinicalNotes: 'Artemether + Augmentin for concurrent respiratory symptoms'
    },
    items: [
      {
        drug: INITIAL_DRUG_ITEMS[1], // Coartem 80/480
        selectedBatch: INITIAL_DRUG_ITEMS[1].batches[0],
        quantity: 1,
        unitPrice: 28.00,
        totalPrice: 28.00,
        isNhisTariff: true,
        dosageInstructions: '1 tablet BD x 3 days'
      },
      {
        drug: INITIAL_DRUG_ITEMS[0], // Augmentin 625mg
        selectedBatch: INITIAL_DRUG_ITEMS[0].batches[0],
        quantity: 1,
        unitPrice: 42.50,
        totalPrice: 42.50,
        isNhisTariff: true,
        dosageInstructions: '1 tablet BD x 7 days'
      }
    ],
    grossAmount: 70.50,
    discountAmount: 0,
    netAmount: 70.50,
    splitBilling: {
      nhisAmount: 70.50,
      privateInsuranceAmount: 0,
      momoAmount: 0,
      cashAmount: 0,
      ghqrAmount: 0,
      patientCopayTotal: 59.50,
      totalPaid: 70.50
    },
    graEvat: {
      status: 'SUCCESS',
      graInvoiceNumber: 'GRA-2026-INV-001091',
      graSecurityHash: '0x8849FA29103C8821',
      graQrCodeString: 'https://verify.gra.gov.gh/evat/inv/001091',
      graTimestamp: getPastIsoTimestamp(0, 9, 15),
      transmissionMode: 'REAL_TIME'
    },
    taxBreakdown: {
      taxableAmount: 70.50,
      nhilAmount: 1.76,
      getfundAmount: 1.76,
      covidAmount: 0.71,
      standardVatAmount: 11.21,
      totalTax: 15.44,
      grandTotal: 70.50,
      leviesIncluded: true
    },
    hasControlledDrugs: false,
    cashierName: 'Pharm. Akosua Mensah',
    isSyncedToCloud: true,
    tamperProofHash: '0x9948AEF0281'
  },

  // Transaction 2: 2 days ago - Chronic NCD: Diabetes & Hypertension (SSNIT)
  {
    id: 'TXN-GH-948202-2',
    sequenceNumber: 2,
    timestamp: getPastIsoTimestamp(2, 11, 45),
    lane: 'clinical',
    patient: INITIAL_PATIENT_PROFILES[2], // Kwame Osei-Tutu
    prescription: {
      prescriberName: 'Dr. Evelyn Asare',
      prescriberMdcNumber: 'MDC/RN/44910',
      prescriberHospital: 'Greater Accra Regional Hospital (Ridge)',
      prescriptionDate: getPastIsoTimestamp(2, 10, 0).split('T')[0],
      diagnosisIcd10: 'E11.9 (Type 2 Diabetes Mellitus) + I10 (Essential Hypertension)',
      clinicalNotes: 'Monthly chronic refill'
    },
    items: [
      {
        drug: INITIAL_DRUG_ITEMS[4], // Metformin 500mg
        selectedBatch: INITIAL_DRUG_ITEMS[4].batches[0],
        quantity: 2,
        unitPrice: 16.50,
        totalPrice: 33.00,
        isNhisTariff: true,
        dosageInstructions: '500mg BD with meals'
      },
      {
        drug: INITIAL_DRUG_ITEMS[5], // Amlodipine 10mg
        selectedBatch: INITIAL_DRUG_ITEMS[5].batches[0],
        quantity: 1,
        unitPrice: 24.00,
        totalPrice: 24.00,
        isNhisTariff: true,
        dosageInstructions: '10mg Nocté'
      }
    ],
    grossAmount: 57.00,
    discountAmount: 0,
    netAmount: 57.00,
    splitBilling: {
      nhisAmount: 57.00,
      privateInsuranceAmount: 0,
      momoAmount: 0,
      cashAmount: 0,
      ghqrAmount: 0,
      patientCopayTotal: 23.00,
      totalPaid: 57.00
    },
    graEvat: {
      status: 'SUCCESS',
      graInvoiceNumber: 'GRA-2026-INV-001092',
      graSecurityHash: '0x1038ABCE481920',
      graQrCodeString: 'https://verify.gra.gov.gh/evat/inv/001092',
      graTimestamp: getPastIsoTimestamp(2, 11, 45),
      transmissionMode: 'REAL_TIME'
    },
    taxBreakdown: {
      taxableAmount: 57.00,
      nhilAmount: 1.43,
      getfundAmount: 1.43,
      covidAmount: 0.57,
      standardVatAmount: 9.06,
      totalTax: 12.49,
      grandTotal: 57.00,
      leviesIncluded: true
    },
    hasControlledDrugs: false,
    cashierName: 'Pharm. Akosua Mensah',
    isSyncedToCloud: true,
    tamperProofHash: '0x9948AEF0282'
  },

  // Transaction 3: 5 days ago - Antenatal & UTI (Pregnant Category)
  {
    id: 'TXN-GH-948203-3',
    sequenceNumber: 3,
    timestamp: getPastIsoTimestamp(5, 14, 20),
    lane: 'clinical',
    patient: INITIAL_PATIENT_PROFILES[1], // Akua Serwaa Dankwa (Pregnant)
    prescription: {
      prescriberName: 'Dr. Joseph N. Addo',
      prescriberMdcNumber: 'MDC/RN/29184',
      prescriberHospital: '37 Military Hospital',
      prescriptionDate: getPastIsoTimestamp(5, 13, 10).split('T')[0],
      diagnosisIcd10: 'N39.0 (Urinary Tract Infection in Pregnancy)',
      clinicalNotes: 'Amoxicillin clavulanate safe in 2nd trimester'
    },
    items: [
      {
        drug: INITIAL_DRUG_ITEMS[0], // Augmentin 625mg
        selectedBatch: INITIAL_DRUG_ITEMS[0].batches[0],
        quantity: 1,
        unitPrice: 42.50,
        totalPrice: 42.50,
        isNhisTariff: true,
        dosageInstructions: '1 tablet BD x 7 days'
      },
      {
        drug: INITIAL_DRUG_ITEMS[6], // Panadol Extra
        selectedBatch: INITIAL_DRUG_ITEMS[6].batches[0],
        quantity: 1,
        unitPrice: 6.00,
        totalPrice: 6.00,
        isNhisTariff: true,
        dosageInstructions: '2 tabs PRN for pyrexia'
      }
    ],
    grossAmount: 48.50,
    discountAmount: 0,
    netAmount: 48.50,
    splitBilling: {
      nhisAmount: 48.50,
      privateInsuranceAmount: 0,
      momoAmount: 0,
      cashAmount: 0,
      ghqrAmount: 0,
      patientCopayTotal: 51.50,
      totalPaid: 48.50
    },
    graEvat: {
      status: 'SUCCESS',
      graInvoiceNumber: 'GRA-2026-INV-001093',
      graSecurityHash: '0x9948210381029',
      graQrCodeString: 'https://verify.gra.gov.gh/evat/inv/001093',
      graTimestamp: getPastIsoTimestamp(5, 14, 20),
      transmissionMode: 'REAL_TIME'
    },
    taxBreakdown: {
      taxableAmount: 48.50,
      nhilAmount: 1.21,
      getfundAmount: 1.21,
      covidAmount: 0.49,
      standardVatAmount: 7.71,
      totalTax: 10.62,
      grandTotal: 48.50,
      leviesIncluded: true
    },
    hasControlledDrugs: false,
    cashierName: 'Pharm. Akosua Mensah',
    isSyncedToCloud: true,
    tamperProofHash: '0x9948AEF0283'
  },

  // Transaction 4: 12 days ago - Acute Diarrhoeal Disease (Informal Sector)
  {
    id: 'TXN-GH-948204-4',
    sequenceNumber: 4,
    timestamp: getPastIsoTimestamp(12, 16, 5),
    lane: 'clinical',
    patient: INITIAL_PATIENT_PROFILES[3], // Ama Pokuaa (Informal)
    prescription: {
      prescriberName: 'Dr. Samuel K. Arthur',
      prescriberMdcNumber: 'MDC/RN/51940',
      prescriberHospital: 'La General Hospital',
      prescriptionDate: getPastIsoTimestamp(12, 15, 0).split('T')[0],
      diagnosisIcd10: 'A09 (Infectious Gastroenteritis & Colitis)',
      clinicalNotes: 'ORS Zinc replacement + Ciprofloxacin'
    },
    items: [
      {
        drug: INITIAL_DRUG_ITEMS[11], // ORS + Zinc
        selectedBatch: INITIAL_DRUG_ITEMS[11].batches[0],
        quantity: 2,
        unitPrice: 5.50,
        totalPrice: 11.00,
        isNhisTariff: true,
        dosageInstructions: 'Dissolve 1 sachet in 1L clean water. Zinc 20mg daily x 10 days'
      },
      {
        drug: INITIAL_DRUG_ITEMS[8], // Ciprofloxacin 500mg
        selectedBatch: INITIAL_DRUG_ITEMS[8].batches[0],
        quantity: 1,
        unitPrice: 20.00,
        totalPrice: 20.00,
        isNhisTariff: true,
        dosageInstructions: '500mg BD x 5 days'
      }
    ],
    grossAmount: 31.00,
    discountAmount: 0,
    netAmount: 31.00,
    splitBilling: {
      nhisAmount: 31.00,
      privateInsuranceAmount: 0,
      momoAmount: 0,
      cashAmount: 0,
      ghqrAmount: 0,
      patientCopayTotal: 21.00,
      totalPaid: 31.00
    },
    graEvat: {
      status: 'SUCCESS',
      graInvoiceNumber: 'GRA-2026-INV-001094',
      graSecurityHash: '0x4482019481028',
      graQrCodeString: 'https://verify.gra.gov.gh/evat/inv/001094',
      graTimestamp: getPastIsoTimestamp(12, 16, 5),
      transmissionMode: 'REAL_TIME'
    },
    taxBreakdown: {
      taxableAmount: 31.00,
      nhilAmount: 0.78,
      getfundAmount: 0.78,
      covidAmount: 0.31,
      standardVatAmount: 4.93,
      totalTax: 6.80,
      grandTotal: 31.00,
      leviesIncluded: true
    },
    hasControlledDrugs: false,
    cashierName: 'Pharm. Akosua Mensah',
    isSyncedToCloud: true,
    tamperProofHash: '0x9948AEF0284'
  },

  // Transaction 5: 25 days ago - Gastroesophageal Reflux & Dyspepsia
  {
    id: 'TXN-GH-948205-5',
    sequenceNumber: 5,
    timestamp: getPastIsoTimestamp(25, 10, 10),
    lane: 'clinical',
    patient: INITIAL_PATIENT_PROFILES[0],
    prescription: {
      prescriberName: 'Dr. Michael K. Mensah',
      prescriberMdcNumber: 'MDC/RN/39482',
      prescriberHospital: 'Korle-Bu Teaching Hospital',
      prescriptionDate: getPastIsoTimestamp(25, 9, 30).split('T')[0],
      diagnosisIcd10: 'K21.9 (Gastro-oesophageal Reflux Disease)',
      clinicalNotes: 'Omeprazole 20mg BD before meals'
    },
    items: [
      {
        drug: INITIAL_DRUG_ITEMS[9], // Omeprazole 20mg
        selectedBatch: INITIAL_DRUG_ITEMS[9].batches[0],
        quantity: 2,
        unitPrice: 12.00,
        totalPrice: 24.00,
        isNhisTariff: true,
        dosageInstructions: '20mg BD x 14 days'
      }
    ],
    grossAmount: 24.00,
    discountAmount: 0,
    netAmount: 24.00,
    splitBilling: {
      nhisAmount: 24.00,
      privateInsuranceAmount: 0,
      momoAmount: 0,
      cashAmount: 0,
      ghqrAmount: 0,
      patientCopayTotal: 26.00,
      totalPaid: 24.00
    },
    graEvat: {
      status: 'SUCCESS',
      graInvoiceNumber: 'GRA-2026-INV-001095',
      graSecurityHash: '0x5592810482019',
      graQrCodeString: 'https://verify.gra.gov.gh/evat/inv/001095',
      graTimestamp: getPastIsoTimestamp(25, 10, 10),
      transmissionMode: 'REAL_TIME'
    },
    taxBreakdown: {
      taxableAmount: 24.00,
      nhilAmount: 0.60,
      getfundAmount: 0.60,
      covidAmount: 0.24,
      standardVatAmount: 3.82,
      totalTax: 5.26,
      grandTotal: 24.00,
      leviesIncluded: true
    },
    hasControlledDrugs: false,
    cashierName: 'Pharm. Akosua Mensah',
    isSyncedToCloud: true,
    tamperProofHash: '0x9948AEF0285'
  },

  // Transaction 6: 38 days ago (Last Month) - Malaria & Fever
  {
    id: 'TXN-GH-948190-6',
    sequenceNumber: 6,
    timestamp: getPastIsoTimestamp(38, 15, 30),
    lane: 'clinical',
    patient: INITIAL_PATIENT_PROFILES[2],
    prescription: {
      prescriberName: 'Dr. Evelyn Asare',
      prescriberMdcNumber: 'MDC/RN/44910',
      prescriberHospital: 'Ridge Hospital Accra',
      prescriptionDate: getPastIsoTimestamp(38, 14, 0).split('T')[0],
      diagnosisIcd10: 'B54 (Plasmodium Falciparum Malaria)',
      clinicalNotes: 'Confirmed RDT positive'
    },
    items: [
      {
        drug: INITIAL_DRUG_ITEMS[1], // Coartem 80/480
        selectedBatch: INITIAL_DRUG_ITEMS[1].batches[0],
        quantity: 1,
        unitPrice: 28.00,
        totalPrice: 28.00,
        isNhisTariff: true,
        dosageInstructions: '1 tablet BD x 3 days'
      },
      {
        drug: INITIAL_DRUG_ITEMS[6], // Panadol Extra
        selectedBatch: INITIAL_DRUG_ITEMS[6].batches[0],
        quantity: 1,
        unitPrice: 6.00,
        totalPrice: 6.00,
        isNhisTariff: true,
        dosageInstructions: '2 tabs TDS PRN'
      }
    ],
    grossAmount: 34.00,
    discountAmount: 0,
    netAmount: 34.00,
    splitBilling: {
      nhisAmount: 34.00,
      privateInsuranceAmount: 0,
      momoAmount: 0,
      cashAmount: 0,
      ghqrAmount: 0,
      patientCopayTotal: 26.00,
      totalPaid: 34.00
    },
    graEvat: {
      status: 'SUCCESS',
      graInvoiceNumber: 'GRA-2026-INV-001080',
      graSecurityHash: '0x1293847581029',
      graQrCodeString: 'https://verify.gra.gov.gh/evat/inv/001080',
      graTimestamp: getPastIsoTimestamp(38, 15, 30),
      transmissionMode: 'REAL_TIME'
    },
    taxBreakdown: {
      taxableAmount: 34.00,
      nhilAmount: 0.85,
      getfundAmount: 0.85,
      covidAmount: 0.34,
      standardVatAmount: 5.41,
      totalTax: 7.45,
      grandTotal: 34.00,
      leviesIncluded: true
    },
    hasControlledDrugs: false,
    cashierName: 'Pharm. Akosua Mensah',
    isSyncedToCloud: true,
    tamperProofHash: '0x9948AEF0286'
  },

  // Transaction 7: 45 days ago (Last Month) - Upper Respiratory Tract Infection (Under 18)
  {
    id: 'TXN-GH-948185-7',
    sequenceNumber: 7,
    timestamp: getPastIsoTimestamp(45, 11, 20),
    lane: 'clinical',
    patient: {
      id: 'pat-005',
      fullName: 'Master Yaw Boadi',
      phone: '+233 24 400 1122',
      nationalId: 'GHA-092817492-3',
      age: 8,
      gender: 'M',
      nhisNumber: 'NHIS-33445566',
      nhisStatus: 'Active',
      nhisCategory: 'Under 18',
      allergies: []
    },
    prescription: {
      prescriberName: 'Dr. Joseph N. Addo',
      prescriberMdcNumber: 'MDC/RN/29184',
      prescriberHospital: 'Princess Marie Louise Children Hospital',
      prescriptionDate: getPastIsoTimestamp(45, 10, 0).split('T')[0],
      diagnosisIcd10: 'J06.9 (Acute Upper Respiratory Infection)',
      clinicalNotes: 'Pediatric cough & bacterial bronchitis'
    },
    items: [
      {
        drug: INITIAL_DRUG_ITEMS[0], // Augmentin 625mg
        selectedBatch: INITIAL_DRUG_ITEMS[0].batches[0],
        quantity: 1,
        unitPrice: 42.50,
        totalPrice: 42.50,
        isNhisTariff: true,
        dosageInstructions: '1 tablet daily x 5 days'
      },
      {
        drug: INITIAL_DRUG_ITEMS[10], // Benylin with Codeine / Cough
        selectedBatch: INITIAL_DRUG_ITEMS[10].batches[0],
        quantity: 1,
        unitPrice: 26.00,
        totalPrice: 26.00,
        isNhisTariff: true,
        dosageInstructions: '5ml TDS x 5 days'
      }
    ],
    grossAmount: 68.50,
    discountAmount: 0,
    netAmount: 68.50,
    splitBilling: {
      nhisAmount: 68.50,
      privateInsuranceAmount: 0,
      momoAmount: 0,
      cashAmount: 0,
      ghqrAmount: 0,
      patientCopayTotal: 71.50,
      totalPaid: 68.50
    },
    graEvat: {
      status: 'SUCCESS',
      graInvoiceNumber: 'GRA-2026-INV-001075',
      graSecurityHash: '0x3394820194820',
      graQrCodeString: 'https://verify.gra.gov.gh/evat/inv/001075',
      graTimestamp: getPastIsoTimestamp(45, 11, 20),
      transmissionMode: 'REAL_TIME'
    },
    taxBreakdown: {
      taxableAmount: 68.50,
      nhilAmount: 1.71,
      getfundAmount: 1.71,
      covidAmount: 0.69,
      standardVatAmount: 10.89,
      totalTax: 15.00,
      grandTotal: 68.50,
      leviesIncluded: true
    },
    hasControlledDrugs: true,
    cashierName: 'Pharm. Akosua Mensah',
    isSyncedToCloud: true,
    tamperProofHash: '0x9948AEF0287'
  }
];

