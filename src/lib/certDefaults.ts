import type { AdditionalTestRow, TestParameterRow } from '@/types'
import { createId } from '@/lib/id'

interface DefaultRow {
  label: string
  minimum?: string
  maximum?: string
  unit?: string
}

const CHEMICAL_DEFAULTS: DefaultRow[] = [
  { label: 'Carbon (C)', minimum: '3.00', maximum: '3.50', unit: '%' },
  { label: 'Silicon (Si)', minimum: '1.50', maximum: '2.20', unit: '%' },
  { label: 'Manganese (Mn)', minimum: '0.50', maximum: '0.90', unit: '%' },
  { label: 'Phosphorus (P)', minimum: '0', maximum: '0.10', unit: '%' },
  { label: 'Sulphur (S)', minimum: '0', maximum: '0.10', unit: '%' },
  { label: 'Chromium (Cr)', minimum: '0', maximum: '0.50', unit: '%' },
  { label: 'Magnesium (Mg)', minimum: '0.030', maximum: '0.060', unit: '%' },
  { label: 'Copper (Cu)', minimum: '0', maximum: '0.80', unit: '%' },
  { label: 'Tin (Sn)', minimum: '0', maximum: '0.10', unit: '%' },
  { label: 'Molybdenum (Mo)', minimum: '0', maximum: '0.10', unit: '%' },
]

const MECHANICAL_DEFAULTS: DefaultRow[] = [
  { label: '0.2% Yield Limit', minimum: '280', unit: 'N/mm2' },
  { label: 'Ultimate Tensile Strength', minimum: '450', unit: 'N/mm2' },
  { label: 'Elongation', minimum: '7', unit: '%' },
  { label: 'Hardness', minimum: '180', maximum: '250', unit: 'BHN' },
]

const MICRO_DEFAULTS: DefaultRow[] = [
  { label: 'Average Nodularity', minimum: '80', maximum: '100', unit: '%' },
  { label: 'Nodule Count', minimum: '100', unit: 'per mm2' },
  { label: 'Pearlite', minimum: '30', maximum: '50', unit: '%' },
  { label: 'Ferrite', minimum: '50', maximum: '70', unit: '%' },
  { label: 'Carbide', minimum: 'NIL', maximum: 'NIL', unit: 'Text' },
]

function toRows(defaults: DefaultRow[]): TestParameterRow[] {
  return defaults.map((d) => ({
    id: createId(),
    label: d.label,
    minimum: d.minimum,
    maximum: d.maximum,
    unit: d.unit,
    observed: undefined,
    result: 'PENDING',
  }))
}

export const DEFAULT_ADDITIONAL_TESTS: AdditionalTestRow[] = [
  {
    id: 'add-test-1',
    label: 'Surface and Dimensional Inspection',
    value: 'As per attached Inspection Report',
  },
  { id: 'add-test-2', label: 'Testing of Material', value: 'Satisfactory' },
  { id: 'add-test-3', label: 'Testing for Material Discrepancies', value: 'NIL' },
  { id: 'add-test-4', label: 'Ultrasonic Testing', value: 'N/A' },
]

export const DEFAULT_REMARKS =
  'WE CERTIFY THAT THE MATERIAL HAS BEEN TESTED AND COMPLIES WITH THE GIVEN PURCHASE ORDER.'

export const DEFAULT_CERTIFICATION_STATEMENT =
  'WE CERTIFY THAT THE MATERIAL HAS BEEN TESTED AND COMPLIES WITH THE GIVEN PURCHASE ORDER.'

export function defaultChemicalRows(): TestParameterRow[] {
  return toRows(CHEMICAL_DEFAULTS)
}

export function defaultMechanicalRows(): TestParameterRow[] {
  return toRows(MECHANICAL_DEFAULTS)
}

export function defaultMicroStructureRows(): TestParameterRow[] {
  return toRows(MICRO_DEFAULTS)
}

export function defaultAdditionalTests(): AdditionalTestRow[] {
  return DEFAULT_ADDITIONAL_TESTS.map((t) => ({ ...t, id: createId() }))
}
