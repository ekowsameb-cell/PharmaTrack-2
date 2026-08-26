import { DrugItem, PatientProfile, PrivateInsurer, PharmacyConfig } from '../types/pharmacy';

// Helper function to calculate date offset from current date
const getDateOffset = (months: number, days: number = 0): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
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
