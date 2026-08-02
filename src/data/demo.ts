export interface DemoClient {
  id: string
  name: string
  location: string
}

export interface DemoPart {
  id: string
  name: string
  partNumber: string
  material: string
  grade: string
}

export type Client = DemoClient
export type Item = DemoPart

export const DEMO_CLIENTS: DemoClient[] = [
  { id: 'client-001', name: 'Apex Engineering Private Limited', location: 'Pune, Maharashtra' },
  { id: 'client-002', name: 'Precision Castings India Ltd', location: 'Coimbatore, Tamil Nadu' },
  { id: 'client-003', name: 'Bharat Forge & Components', location: 'Ahmedabad, Gujarat' },
  { id: 'client-004', name: 'Shivam Auto Parts Pvt Ltd', location: 'Faridabad, Haryana' },
  { id: 'client-005', name: 'Metro Pump Industries', location: 'Rajkot, Gujarat' },
  { id: 'client-006', name: 'Delta Machinery Works', location: 'Ludhiana, Punjab' },
  { id: 'client-007', name: 'Galaxy Foundry Solutions', location: 'Belgaum, Karnataka' },
  { id: 'client-008', name: 'Sunrise Engineering Co', location: 'Jaipur, Rajasthan' },
]

export const DEMO_PARTS: DemoPart[] = [
  { id: 'part-001', name: 'Ductile Iron Pump Housing', partNumber: 'PH-801', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 500/7' },
  { id: 'part-002', name: 'Cast Iron Valve Body', partNumber: 'VB-220', material: 'Grey Cast Iron', grade: 'IS 210 FG 260' },
  { id: 'part-003', name: 'SG Iron Impeller', partNumber: 'IM-340', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 500/7' },
  { id: 'part-004', name: 'Ductile Iron Flange', partNumber: 'FL-110', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 450/10' },
  { id: 'part-005', name: 'CI Compressor Casing', partNumber: 'CC-501', material: 'Grey Cast Iron', grade: 'IS 210 FG 300' },
  { id: 'part-006', name: 'SG Iron Gear Blank', partNumber: 'GB-070', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 600/3' },
  { id: 'part-007', name: 'Ductile Iron Bearing Housing', partNumber: 'BH-230', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 500/7' },
  { id: 'part-008', name: 'CI Manhole Cover', partNumber: 'MC-090', material: 'Grey Cast Iron', grade: 'IS 3989 Grade 4' },
  { id: 'part-009', name: 'SG Iron Pulley', partNumber: 'PU-560', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 500/7' },
  { id: 'part-010', name: 'Ductile Iron Pipe Fitting', partNumber: 'PF-300', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 400/15' },
  { id: 'part-011', name: 'CI Pump Casing', partNumber: 'PC-410', material: 'Grey Cast Iron', grade: 'IS 210 FG 260' },
  { id: 'part-012', name: 'SG Iron Coupling Half', partNumber: 'CH-640', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 450/10' },
]
