import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SettingsState {
  companyName: string
  companyAddress: string
  formatNumber: string
  revisionText: string
  licenseNumber: string
  standardReference: string
  defaultRemarks: string
  signatureImage: string
  stampImage: string
  setSettings: (patch: Partial<Omit<SettingsState, 'setSettings'>>) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS = {
  companyName: 'GN ALTECH PRIVATE LIMITED',
  companyAddress: 'Plot No. 12, Industrial Area, Gujarat, India',
  formatNumber: 'F QA 39',
  revisionText: '03 / 15.09.2025',
  licenseNumber: '',
  standardReference: 'IS 1865',
  defaultRemarks:
    'WE CERTIFY THAT THE MATERIAL HAS BEEN TESTED AND COMPLIES WITH THE GIVEN PURCHASE ORDER.',
  signatureImage: '',
  stampImage: '',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setSettings: (patch) => set(patch),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'gn-alt-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
