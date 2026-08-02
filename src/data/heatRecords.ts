import type { HeatRecord } from '@/types'

const A6A_HEAT_ID = 'heat-a6a'

const SEEDS = [
  {
    id: A6A_HEAT_ID,
    itemId: 'part-001',
    quantity: 801,
    dailyHeat: 'A6A',
    monthlyHeat: 'AY-001',
    yearlyHeat: '2026',
    batchNo: 'B-0726-04',
    status: 'USED' as const,
    date: '2026-07-28',
  },
  { id: 'heat-002', itemId: 'part-002', quantity: 250, dailyHeat: 'B6B', monthlyHeat: 'AY-002', yearlyHeat: '2026', batchNo: 'B-0726-01', status: 'ACTIVE' as const, date: '2026-07-26' },
  { id: 'heat-003', itemId: 'part-003', quantity: 120, dailyHeat: 'C6C', monthlyHeat: 'AY-003', yearlyHeat: '2026', batchNo: 'B-0726-05', status: 'ACTIVE' as const, date: '2026-07-25' },
  { id: 'heat-004', itemId: 'part-004', quantity: 500, dailyHeat: 'D6D', monthlyHeat: 'AY-004', yearlyHeat: '2026', batchNo: 'B-0726-02', status: 'USED' as const, date: '2026-07-24' },
  { id: 'heat-005', itemId: 'part-005', quantity: 60, dailyHeat: 'E6E', monthlyHeat: 'AY-005', yearlyHeat: '2026', batchNo: 'B-0726-07', status: 'ACTIVE' as const, date: '2026-07-23' },
  { id: 'heat-006', itemId: 'part-006', quantity: 300, dailyHeat: 'F6F', monthlyHeat: 'AY-006', yearlyHeat: '2026', batchNo: 'B-0726-03', status: 'ARCHIVED' as const, date: '2026-07-22' },
  { id: 'heat-007', itemId: 'part-007', quantity: 180, dailyHeat: 'A6G', monthlyHeat: 'AY-007', yearlyHeat: '2026', batchNo: 'B-0726-09', status: 'ACTIVE' as const, date: '2026-07-21' },
  { id: 'heat-008', itemId: 'part-008', quantity: 40, dailyHeat: 'B6H', monthlyHeat: 'AY-008', yearlyHeat: '2026', batchNo: 'B-0726-11', status: 'USED' as const, date: '2026-07-20' },
  { id: 'heat-009', itemId: 'part-009', quantity: 95, dailyHeat: 'C6I', monthlyHeat: 'AY-009', yearlyHeat: '2026', batchNo: 'B-0726-06', status: 'ACTIVE' as const, date: '2026-07-19' },
  { id: 'heat-010', itemId: 'part-010', quantity: 420, dailyHeat: 'D6J', monthlyHeat: 'AY-010', yearlyHeat: '2026', batchNo: 'B-0726-12', status: 'ACTIVE' as const, date: '2026-07-18' },
  { id: 'heat-011', itemId: 'part-011', quantity: 75, dailyHeat: 'E6K', monthlyHeat: 'AY-011', yearlyHeat: '2026', batchNo: 'B-0726-08', status: 'USED' as const, date: '2026-07-17' },
  { id: 'heat-012', itemId: 'part-012', quantity: 150, dailyHeat: 'F6L', monthlyHeat: 'AY-012', yearlyHeat: '2026', batchNo: 'B-0726-13', status: 'ACTIVE' as const, date: '2026-07-16' },
  { id: 'heat-013', itemId: 'part-001', quantity: 210, dailyHeat: 'A6M', monthlyHeat: 'AY-013', yearlyHeat: '2026', batchNo: 'B-0726-10', status: 'ACTIVE' as const, date: '2026-07-15' },
  { id: 'heat-014', itemId: 'part-002', quantity: 90, dailyHeat: 'B6N', monthlyHeat: 'AY-014', yearlyHeat: '2026', batchNo: 'B-0726-14', status: 'ARCHIVED' as const, date: '2026-07-14' },
  { id: 'heat-015', itemId: 'part-003', quantity: 330, dailyHeat: 'C6O', monthlyHeat: 'AY-015', yearlyHeat: '2026', batchNo: 'B-0726-15', status: 'ACTIVE' as const, date: '2026-07-13' },
  { id: 'heat-016', itemId: 'part-004', quantity: 140, dailyHeat: 'D6P', monthlyHeat: 'AY-016', yearlyHeat: '2026', batchNo: 'B-0726-16', status: 'USED' as const, date: '2026-07-12' },
  { id: 'heat-017', itemId: 'part-005', quantity: 55, dailyHeat: 'E6Q', monthlyHeat: 'AY-017', yearlyHeat: '2026', batchNo: 'B-0726-17', status: 'ACTIVE' as const, date: '2026-07-11' },
  { id: 'heat-018', itemId: 'part-006', quantity: 265, dailyHeat: 'F6R', monthlyHeat: 'AY-018', yearlyHeat: '2026', batchNo: 'B-0726-18', status: 'ACTIVE' as const, date: '2026-07-10' },
  { id: 'heat-019', itemId: 'part-007', quantity: 110, dailyHeat: 'A6S', monthlyHeat: 'AY-019', yearlyHeat: '2026', batchNo: 'B-0726-19', status: 'ARCHIVED' as const, date: '2026-07-09' },
  { id: 'heat-020', itemId: 'part-008', quantity: 85, dailyHeat: 'B6T', monthlyHeat: 'AY-020', yearlyHeat: '2026', batchNo: 'B-0726-20', status: 'ACTIVE' as const, date: '2026-07-08' },
]

export function buildDemoHeatRecords(): HeatRecord[] {
  return SEEDS.map((s) => {
    return {
      id: s.id,
      itemId: s.itemId,
      dailyHeatNumber: s.dailyHeat,
      monthlyHeatNumber: s.monthlyHeat,
      yearlyHeatNumber: s.yearlyHeat,
      batchNumber: s.batchNo,
      quantity: s.quantity,
      quantityUnit: 'Nos.',
      invoiceNumber: '',
      invoiceDate: s.date,
      deliveryCondition: 'As Cast',
      productionDate: s.date,
      remarks: '',
      status: s.status,
      createdAt: `${s.date}T09:00:00.000Z`,
      updatedAt: `${s.date}T09:00:00.000Z`,
    }
  })
}
