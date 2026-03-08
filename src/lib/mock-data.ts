// Mock data for GigShield demo

export const zones = [
  { id: 'mum-and', name: 'Mumbai - Andheri', city: 'Mumbai', lat: 19.1136, lng: 72.8697, riskScore: 0.82 },
  { id: 'mum-ban', name: 'Mumbai - Bandra', city: 'Mumbai', lat: 19.0544, lng: 72.8401, riskScore: 0.75 },
  { id: 'mum-dad', name: 'Mumbai - Dadar', city: 'Mumbai', lat: 19.0178, lng: 72.8478, riskScore: 0.78 },
  { id: 'mum-pow', name: 'Mumbai - Powai', city: 'Mumbai', lat: 19.1176, lng: 72.9060, riskScore: 0.71 },
  { id: 'del-cp', name: 'Delhi - Connaught Place', city: 'Delhi', lat: 28.6315, lng: 77.2167, riskScore: 0.55 },
  { id: 'del-dwk', name: 'Delhi - Dwarka', city: 'Delhi', lat: 28.5921, lng: 77.0460, riskScore: 0.48 },
  { id: 'del-noi', name: 'Delhi - Noida Sec-62', city: 'Delhi', lat: 28.6270, lng: 77.3647, riskScore: 0.52 },
  { id: 'blr-kor', name: 'Bangalore - Koramangala', city: 'Bangalore', lat: 12.9352, lng: 77.6245, riskScore: 0.42 },
  { id: 'blr-whi', name: 'Bangalore - Whitefield', city: 'Bangalore', lat: 12.9698, lng: 77.7500, riskScore: 0.38 },
  { id: 'hyd-hit', name: 'Hyderabad - HITEC City', city: 'Hyderabad', lat: 17.4435, lng: 78.3772, riskScore: 0.35 },
  { id: 'jai-cit', name: 'Jaipur - City Center', city: 'Jaipur', lat: 26.9124, lng: 75.7873, riskScore: 0.30 },
  { id: 'che-ann', name: 'Chennai - Anna Nagar', city: 'Chennai', lat: 13.0850, lng: 80.2101, riskScore: 0.65 },
];

export const triggerTypes = [
  { id: 'RAIN_HEAVY', label: 'Heavy Rainfall', icon: '🌧️', threshold: '> 50mm/hr for 2+ hrs' },
  { id: 'RAIN_EXTREME', label: 'Extreme Rain / Flood', icon: '🌊', threshold: '> 100mm/hr OR flood alert' },
  { id: 'HEAT_EXTREME', label: 'Extreme Heat', icon: '🔥', threshold: '> 45°C for 3+ hrs' },
  { id: 'AQI_SEVERE', label: 'Severe AQI', icon: '😷', threshold: 'AQI > 400 for 4+ hrs' },
  { id: 'CURFEW_LOCAL', label: 'Local Curfew / Bandh', icon: '🚫', threshold: 'Verified curfew in zone' },
  { id: 'STORM_CYCLONE', label: 'Cyclone / Storm', icon: '🌀', threshold: 'Severe weather alert' },
];

export const mockWorker = {
  id: 'w-001',
  name: 'Raju Kumar',
  phone: '+91 98765 43210',
  platform: 'Zomato',
  city: 'Mumbai',
  zone: 'mum-and',
  zoneName: 'Mumbai - Andheri',
  shieldScore: 85,
  weeklyEarnings: 4800,
  activePlan: {
    tier: 'STANDARD' as const,
    startDate: '2026-03-03',
    endDate: '2026-03-09',
    premium: 69,
    maxPayout: 2500,
    status: 'active' as const,
  },
  claimedThisWeek: 1200,
  claims: [
    { id: 'c-001', date: '2026-03-05', type: 'RAIN_HEAVY', amount: 600, status: 'approved' as const, fraudScore: 0.08 },
    { id: 'c-002', date: '2026-03-04', type: 'RAIN_HEAVY', amount: 600, status: 'approved' as const, fraudScore: 0.05 },
    { id: 'c-003', date: '2026-03-02', type: 'AQI_SEVERE', amount: 400, status: 'processing' as const, fraudScore: 0.12 },
    { id: 'c-004', date: '2026-02-28', type: 'HEAT_EXTREME', amount: 450, status: 'approved' as const, fraudScore: 0.03 },
    { id: 'c-005', date: '2026-02-25', type: 'RAIN_EXTREME', amount: 600, status: 'flagged' as const, fraudScore: 0.67 },
  ],
};

export const mockAdminStats = {
  totalWorkers: 12450,
  workerGrowth: 8,
  activePolicies: 8920,
  claimsThisWeek: 342,
  lossRatio: 62,
  totalPremiumCollected: 615780,
  totalClaimsPaid: 381982,
  avgClaimAmount: 1117,
  fraudFlagRate: 4.2,
};

export const mockClaimsData = [
  { day: 'Mon', claims: 32, amount: 19200 },
  { day: 'Tue', claims: 89, amount: 53400 },
  { day: 'Wed', claims: 45, amount: 27000 },
  { day: 'Thu', claims: 120, amount: 72000 },
  { day: 'Fri', claims: 56, amount: 33600 },
  { day: 'Sat', claims: 28, amount: 16800 },
  { day: 'Sun', claims: 15, amount: 9000 },
];

export const mockFraudAlerts = [
  { workerId: 'w-4521', name: 'Suresh P.', type: 'GPS mismatch', severity: 'high' as const, score: 0.89, zone: 'mum-ban', timestamp: '2026-03-07 14:32' },
  { workerId: 'w-8832', name: 'Anil M.', type: 'High frequency claims', severity: 'medium' as const, score: 0.56, zone: 'del-cp', timestamp: '2026-03-07 11:15' },
  { workerId: 'w-2291', name: 'Priya S.', type: 'Network collusion', severity: 'high' as const, score: 0.92, zone: 'mum-and', timestamp: '2026-03-06 18:44' },
  { workerId: 'w-6673', name: 'Deepak R.', type: 'Velocity check fail', severity: 'low' as const, score: 0.34, zone: 'blr-kor', timestamp: '2026-03-06 09:20' },
];

export const mockPredictions = [
  { city: 'Mumbai', probability: 78, event: 'Heavy rain', estClaims: 240000, reserve: 300000 },
  { city: 'Delhi', probability: 45, event: 'AQI spike', estClaims: 85000, reserve: 120000 },
  { city: 'Chennai', probability: 62, event: 'Cyclonic weather', estClaims: 180000, reserve: 250000 },
  { city: 'Bangalore', probability: 15, event: 'Normal', estClaims: 20000, reserve: 40000 },
];

export const mockFinancials = [
  { month: 'Oct', premium: 420000, claims: 260000 },
  { month: 'Nov', premium: 480000, claims: 310000 },
  { month: 'Dec', premium: 390000, claims: 180000 },
  { month: 'Jan', premium: 450000, claims: 220000 },
  { month: 'Feb', premium: 520000, claims: 340000 },
  { month: 'Mar', premium: 615780, claims: 381982 },
];

export const mockNetworkFraud = {
  nodes: [
    { id: 'w-4521', name: 'Suresh P.', flagged: true },
    { id: 'w-4522', name: 'Ravi K.', flagged: true },
    { id: 'w-4523', name: 'Mohan D.', flagged: true },
    { id: 'w-1001', name: 'Amit S.', flagged: false },
    { id: 'w-1002', name: 'Vikram L.', flagged: false },
    { id: 'device-001', name: 'Device A', flagged: true },
    { id: 'upi-001', name: 'UPI *4521', flagged: true },
  ],
  links: [
    { source: 'w-4521', target: 'device-001', type: 'Same device' },
    { source: 'w-4522', target: 'device-001', type: 'Same device' },
    { source: 'w-4523', target: 'upi-001', type: 'Same UPI' },
    { source: 'w-4521', target: 'upi-001', type: 'Same UPI' },
    { source: 'w-4522', target: 'w-4523', type: 'Correlated claims' },
    { source: 'w-1001', target: 'w-1002', type: 'Same zone' },
  ],
};
