/**
 * The 16 real lab files shipped in public/demo-data/lab-reports
 * (copied from 01.Chemical data / 02.Micro data / 03.Tensile data / 04.Hardness data).
 * One-click seeding loads all of them with the same (SAP, heat) +
 * Sample A/B/C rules used by the upload pages.
 */
export interface LabDemoEntry {
  folder: 'chemical' | 'micro' | 'tensile' | 'hardness'
  file: string
  sectionKey: string
}

export const LAB_DEMO_MANIFEST: LabDemoEntry[] = [
  { folder: 'chemical', file: '02. G6E RS12 7005.pdf', sectionKey: 'CHEMICAL' },
  { folder: 'chemical', file: '03. GZ-56 P COVER.pdf', sectionKey: 'CHEMICAL' },
  { folder: 'chemical', file: '04. GZ-530 P FLANGE.pdf', sectionKey: 'CHEMICAL' },
  { folder: 'chemical', file: '07.GZ-1026 H CASTING.pdf', sectionKey: 'CHEMICAL' },
  { folder: 'micro', file: '02. G6E RS12 7005.bmp', sectionKey: 'MICRO' },
  { folder: 'micro', file: '03. GZ-56 P COVER.bmp', sectionKey: 'MICRO' },
  { folder: 'micro', file: '04. GZ-530 P FLANGE.bmp', sectionKey: 'MICRO' },
  { folder: 'micro', file: '07.G6O TORQUE MOTOR.bmp', sectionKey: 'MICRO' },
  { folder: 'tensile', file: '02. G6E-A RS12 7005.pdf', sectionKey: 'TENSILE' },
  { folder: 'tensile', file: '03. GZ-56 P-COVER.pdf', sectionKey: 'TENSILE' },
  { folder: 'tensile', file: '04. GZ-530 P FLANGE.pdf', sectionKey: 'TENSILE' },
  { folder: 'tensile', file: '07. GZ-1026 TORQUE MOTOR.pdf', sectionKey: 'TENSILE' },
  { folder: 'hardness', file: '02. 7005 ( G6E).pdf', sectionKey: 'HARDNESS' },
  { folder: 'hardness', file: '03. P. Cover 934 (GZ-56).pdf', sectionKey: 'HARDNESS' },
  { folder: 'hardness', file: '04. P. Flange 936 (GZ-530).pdf', sectionKey: 'HARDNESS' },
  { folder: 'hardness', file: '07.G6O TORQE MOTOR.pdf', sectionKey: 'HARDNESS' },
]
