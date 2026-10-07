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
    serviceType: 'INTERNAL',
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
  },
  {
    id: 'sr-1088',
    customId: 'SR-1088',
    title: 'High-Pressure Servo Inverter OEM Recalibration',
    description:
      'Internal technician diagnosed inverter phase balance mismatch (Error E-702). Escalated to external contractor Apex Hydraulics Ltd due to OEM warranty and proprietary calibration kit requirement.',
    machineId: 'mach-208',
    machineCode: 'M-208',
    machineName: 'CNC Milling Center',
    siteId: 'site-chennai',
    siteName: 'Chennai Plant A',
    priority: 'HIGH',
    requiredSkill: 'CNC / PLC Controls',
    status: 'ASSIGNED',
    serviceType: 'EXTERNAL',
    escalationReason: 'Active OEM Warranty & Lack of Proprietary Calibration Jig',
    assignedVendorAgency: 'Apex Hydraulics & OEM Automation Ltd',
    diagnosticSnapshotUrl: '/storage/snapshots/sr-1088/snap-inverter-diag.json',
    diagnosticSnapshot: {
      notes:
        'Phase W current distortion exceeds 14%. Requires Bosch Rexroth certified firmware flasher and high-voltage diagnostic probe.',
      telemetry: {
        'Working Pressure': '182.4 Bar',
        'Operating Temp': '68.2 °C',
        'Phase Imbalance': '14.8 %',
        'Vibration Level': '2.8 mm/s'
      },
      photos: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
      ],
      escalatedAt: '09:42 AM',
      escalatedBy: 'Arjun Raman (Plant Crew)',
      targetAgency: 'Apex Hydraulics & OEM Automation Ltd'
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Vikram Mehta (Plant Operator)',
    creatorRole: 'CUSTOMER',
    contactName: 'Vikram Mehta',
    contactPhone: '+91 98401 23456',
    requiredPartId: 'part-bearing',
    requiredPartName: 'Precision Spindle Bearing Set',
    requiredPartQuantity: 1,
    requiredTools: ['Proprietary Rexroth Calibration Rig', 'Class 0 Fluke Probe'],
    estimatedDurationHours: 2.0,
    slaDurationMinutes: 120,
    slaDeadline: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    slaHealth: 'ON_TRACK',
    reservations: [],
    activeExceptions: [
      {
        id: 'exc-vendor-1',
        requestId: 'sr-1088',
        requestTitle: 'High-Pressure Servo Inverter OEM Recalibration',
        machineCode: 'M-208',
        type: 'RESOURCE_CONFLICT',
        severity: 'HIGH',
        description:
          'Escalated to External Vendor (Apex Hydraulics Ltd): Active OEM Warranty & Lack of Proprietary Calibration Jig',
        detectedAt: '09:42 AM',
        resolved: false,
        suggestedAction:
          'Contractor agency Apex Hydraulics Ltd dispatched with preserved telemetry snapshot.'
      }
    ],
    auditTrail: [
      {
        id: 'aud-v1',
        requestId: 'sr-1088',
        stepNumber: 1,
        eventType: 'REQUEST_CREATED',
        timestamp: '09:30 AM',
        actorName: 'Vikram Mehta',
        actorRole: 'CUSTOMER',
        fromStatus: '-',
        toStatus: 'NEW',
        summary: 'Service Request SR-1088 created for CNC Milling Center M-208'
      },
      {
        id: 'aud-v2',
        requestId: 'sr-1088',
        stepNumber: 14,
        eventType: 'ESCALATED_TO_EXTERNAL_VENDOR',
        timestamp: '09:42 AM',
        actorName: 'Arjun Raman (Plant Crew)',
        actorRole: 'INTERNAL_TECHNICIAN',
        fromStatus: 'IN_PROGRESS',
        toStatus: 'ASSIGNED',
        summary:
          'Internal technician escalated ticket to Apex Hydraulics Ltd. Reason: Active OEM Warranty & Lack of Proprietary Calibration Jig.'
      }
    ]
  }
];
