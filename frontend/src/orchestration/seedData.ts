import {
  IndustrialMachine,
  SiteLocation,
  SkillRequirement,
  TechnicianProfile,
  SparePartItem,
  ServiceRequest
} from './types';

export const INITIAL_SITES: SiteLocation[] = [
  {
    id: 'site-chennai',
    code: 'CHN-A',
    name: 'Chennai Plant A',
    city: 'Chennai',
    address: 'Plot 42, Ambattur Industrial Estate, Chennai, Tamil Nadu 600058',
    latitude: 13.0827,
    longitude: 80.2707,
    contactPerson: 'Karthik Subramanian',
    contactPhone: '+91 98401 23456'
  },
  {
    id: 'site-bangalore',
    code: 'BLR-B',
    name: 'Bangalore Plant B',
    city: 'Bangalore',
    address: 'Electronics City Phase 1, Hosur Road, Bangalore, Karnataka 560100',
    latitude: 12.9716,
    longitude: 77.5946,
    contactPerson: 'Priya Narayanan',
    contactPhone: '+91 98802 34567'
  },
  {
    id: 'site-hyderabad',
    code: 'HYD-C',
    name: 'Hyderabad Plant C',
    city: 'Hyderabad',
    address: 'IDA Mallapur, Nacharam Industrial Area, Hyderabad, Telangana 500076',
    latitude: 17.385,
    longitude: 78.4867,
    contactPerson: 'Vikram Reddy',
    contactPhone: '+91 99493 45678'
  }
];

export const INITIAL_MACHINES: IndustrialMachine[] = [
  {
    id: 'mach-104',
    code: 'M-104',
    name: 'Hydraulic Press 500T',
    type: 'Heavy Stamping Press',
    manufacturer: 'Schuler Automation',
    model: 'SHP-500-HD',
    serialNumber: 'SCH-2022-M104-IND',
    siteId: 'site-chennai',
    siteName: 'Chennai Plant A',
    status: 'DOWN',
    eligibilityStatus: 'ELIGIBLE',
    installationDate: '2022-03-15',
    lastServiceDate: '2026-08-10',
    nextServiceDate: '2026-11-10',
    activeRequestId: 'sr-1042'
  },
  {
    id: 'mach-208',
    code: 'M-208',
    name: 'CNC Milling Machine 5-Axis',
    type: 'Precision Machining Center',
    manufacturer: 'DMG MORI',
    model: 'DMU-50-GEN3',
    serialNumber: 'DMG-2023-M208-BLR',
    siteId: 'site-bangalore',
    siteName: 'Bangalore Plant B',
    status: 'OPERATIONAL',
    eligibilityStatus: 'ELIGIBLE',
    installationDate: '2023-01-20',
    lastServiceDate: '2026-09-01',
    nextServiceDate: '2026-12-01'
  },
  {
    id: 'mach-301',
    code: 'M-301',
    name: 'Industrial Screw Compressor',
    type: 'Compressed Air System',
    manufacturer: 'Atlas Copco',
    model: 'GA-90-VSD',
    serialNumber: 'AC-2021-M301-HYD',
    siteId: 'site-hyderabad',
    siteName: 'Hyderabad Plant C',
    status: 'OPERATIONAL',
    eligibilityStatus: 'ELIGIBLE',
    installationDate: '2021-07-11',
    lastServiceDate: '2026-07-25',
    nextServiceDate: '2026-10-25'
  },
  {
    id: 'mach-402',
    code: 'M-402',
    name: 'Injection Molding Machine 250T',
    type: 'Polymer Processing',
    manufacturer: 'Engel Machinery',
    model: 'ENG-VICTORY-250',
    serialNumber: 'ENG-2024-M402-CHN',
    siteId: 'site-chennai',
    siteName: 'Chennai Plant A',
    status: 'OPERATIONAL',
    eligibilityStatus: 'ELIGIBLE',
    installationDate: '2024-02-14',
    lastServiceDate: '2026-08-30',
    nextServiceDate: '2026-11-30'
  }
];

export const INITIAL_SKILLS: SkillRequirement[] = [
  { id: 'sk-hyd', name: 'Hydraulics', category: 'Fluid Power', minLevelRequired: 3 },
  { id: 'sk-elec', name: 'Electrical', category: 'Power & Controls', minLevelRequired: 2 },
  { id: 'sk-mech', name: 'Mechanical', category: 'Drive Systems', minLevelRequired: 2 },
  { id: 'sk-cnc', name: 'CNC', category: 'Machining', minLevelRequired: 3 },
  { id: 'sk-hvac', name: 'HVAC', category: 'Climate Systems', minLevelRequired: 2 },
  { id: 'sk-inst', name: 'Instrumentation', category: 'Sensors & Calibration', minLevelRequired: 3 }
];

export const INITIAL_TECHNICIANS: TechnicianProfile[] = [
  {
    id: 'tech-a',
    name: 'Technician A (Amit Verma)',
    email: 'amit.verma@equinox-fsm.com',
    phone: '+91 98111 22334',
    skills: [
      { skillName: 'Hydraulics', level: 2, certified: true },
      { skillName: 'Mechanical', level: 3, certified: true }
    ],
    currentLocation: {
      latitude: 13.045,
      longitude: 80.21,
      city: 'Chennai'
    },
    isAvailable: true,
    currentWorkload: 3, // High workload
    rating: 4.4,
    activeStatus: 'AVAILABLE'
  },
  {
    id: 'tech-b',
    name: 'Technician B (Rajesh Kumar)',
    email: 'rajesh.kumar@equinox-fsm.com',
    phone: '+91 98222 33445',
    skills: [
      { skillName: 'Hydraulics', level: 4, certified: true },
      { skillName: 'Mechanical', level: 4, certified: true },
      { skillName: 'Electrical', level: 3, certified: true }
    ],
    currentLocation: {
      latitude: 13.085,
      longitude: 80.268,
      city: 'Chennai'
    },
    isAvailable: true,
    currentWorkload: 0, // Low workload
    rating: 4.9,
    activeStatus: 'AVAILABLE'
  },
  {
    id: 'tech-c',
    name: 'Technician C (Suresh Nair)',
    email: 'suresh.nair@equinox-fsm.com',
    phone: '+91 98333 44556',
    skills: [
      { skillName: 'Electrical', level: 4, certified: true },
      { skillName: 'Instrumentation', level: 4, certified: true }
    ],
    currentLocation: {
      latitude: 13.08,
      longitude: 80.27,
      city: 'Chennai'
    },
    isAvailable: true,
    currentWorkload: 0,
    rating: 4.7,
    activeStatus: 'AVAILABLE'
  },
  {
    id: 'tech-d',
    name: 'Technician D (Deepak Sharma)',
    email: 'deepak.sharma@equinox-fsm.com',
    phone: '+91 98444 55667',
    skills: [
      { skillName: 'Hydraulics', level: 4, certified: true },
      { skillName: 'Mechanical', level: 4, certified: true }
    ],
    currentLocation: {
      latitude: 13.09,
      longitude: 80.265,
      city: 'Chennai'
    },
    isAvailable: true,
    currentWorkload: 0,
    rating: 4.8,
    activeStatus: 'AVAILABLE'
  }
];

export const INITIAL_PARTS: SparePartItem[] = [
  {
    id: 'part-pump',
    code: 'HP-800',
    name: 'Hydraulic Pump Assembly 250 Bar',
    category: 'Hydraulics',
    unitCost: 18500,
    totalStock: 5,
    reservedStock: 0,
    availableStock: 5,
    consumedStock: 0,
    minThreshold: 2,
    storageBin: 'BIN-HYD-04',
    warehouseLocation: 'Chennai Central Depot'
  },
  {
    id: 'part-valve',
    code: 'PRV-200',
    name: 'Proportional Pressure Relief Valve',
    category: 'Hydraulics',
    unitCost: 6400,
    totalStock: 12,
    reservedStock: 0,
    availableStock: 12,
    consumedStock: 0,
    minThreshold: 4,
    storageBin: 'BIN-HYD-09',
    warehouseLocation: 'Chennai Central Depot'
  },
  {
    id: 'part-motor',
    code: 'HTM-50',
    name: 'High-Torque AC Servo Motor 7.5kW',
    category: 'Electrical',
    unitCost: 32000,
    totalStock: 3,
    reservedStock: 0,
    availableStock: 3,
    consumedStock: 0,
    minThreshold: 1,
    storageBin: 'BIN-ELEC-01',
    warehouseLocation: 'Chennai Central Depot'
  },
  {
    id: 'part-bearing',
    code: 'PRB-108',
    name: 'Heavy-Duty Tapered Roller Bearing',
    category: 'Mechanical',
    unitCost: 2200,
    totalStock: 25,
    reservedStock: 0,
    availableStock: 25,
    consumedStock: 0,
    minThreshold: 8,
    storageBin: 'BIN-MECH-15',
    warehouseLocation: 'Chennai Central Depot'
  },
  {
    id: 'part-plc',
    code: 'PLC-400',
    name: 'Safety PLC CPU Module',
    category: 'Instrumentation',
    unitCost: 45000,
    totalStock: 7,
    reservedStock: 0,
    availableStock: 7,
    consumedStock: 0,
    minThreshold: 2,
    storageBin: 'BIN-INST-03',
    warehouseLocation: 'Chennai Central Depot'
  }
];

export const INITIAL_REQUESTS: ServiceRequest[] = [
  {
    id: 'sr-1042',
    customId: 'SR-1042',
    title: 'Hydraulic Pressure Failure',
    description:
      'Machine is showing abnormal hydraulic pressure fluctuations and has automatically halted operation on Stage 3 stamping.',
    machineId: 'mach-104',
    machineCode: 'M-104',
    machineName: 'Hydraulic Press 500T',
    siteId: 'site-chennai',
    siteName: 'Chennai Plant A',
    priority: 'URGENT',
    requiredSkill: 'Hydraulics',
    status: 'NEW',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Ramesh Sundaram (Plant Operator)',
    creatorRole: 'CUSTOMER',
    contactName: 'Ramesh Sundaram',
    contactPhone: '+91 98401 98765',
    requiredPartId: 'part-pump',
    requiredPartName: 'Hydraulic Pump Assembly 250 Bar',
    requiredPartQuantity: 1,
    requiredTools: ['Hydraulic Service Kit', 'Digital Pressure Gauge Rig'],
    estimatedDurationHours: 1.5,
    slaDurationMinutes: 60,
    slaDeadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    slaHealth: 'ON_TRACK',
    reservations: [],
    activeExceptions: [],
    auditTrail: [
      {
        id: 'aud-1',
        requestId: 'sr-1042',
        stepNumber: 1,
        eventType: 'REQUEST_CREATED',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actorName: 'Ramesh Sundaram',
        actorRole: 'CUSTOMER',
        fromStatus: '-',
        toStatus: 'NEW',
        summary: 'Service Request SR-1042 created for Machine M-104 (Hydraulic pressure failure)'
      }
    ]
  }
];
