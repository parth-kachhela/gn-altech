import { z } from 'zod'

export const heatRecordSchema = z.object({
  itemId: z.string().min(1, 'Part is required'),
  dailyHeatNumber: z.string().min(1, 'Daily heat number is required'),
  monthlyHeatNumber: z.string().optional(),
  yearlyHeatNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  quantityUnit: z.string().min(1, 'Unit is required'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  deliveryCondition: z.string().optional(),
  productionDate: z.string().optional(),
  remarks: z.string().optional(),
})

export type HeatRecordFormValues = z.infer<typeof heatRecordSchema>

export const certificateInfoSchema = z.object({
  certificateNumber: z.string().min(1, 'Certificate number is required'),
  certificateDate: z.string().min(1, 'Certificate date is required'),
  clientId: z.string().min(1, 'Client is required'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  deliveryCondition: z.string().optional(),
  material: z.string().optional(),
  grade: z.string().optional(),
})

export type CertificateInfoValues = z.infer<typeof certificateInfoSchema>

export const reportParserSchema = z.object({
  fileName: z.string().min(1),
  reportType: z.enum(['CHEMICAL', 'HARDNESS', 'MICRO_STRUCTURE']),
})

export type ReportParserValues = z.infer<typeof reportParserSchema>
