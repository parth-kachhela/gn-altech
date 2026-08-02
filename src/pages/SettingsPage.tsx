import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Moon, Sun, Trash2, Upload } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/stores/settingsStore'
import { useThemeStore } from '@/stores/themeStore'
import { useTheme } from '@/hooks/useTheme'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

const STORE_KEYS = [
  'gn-alt-certificates',
  'gn-alt-heat-records',
  'gn-alt-settings',
  'gn-alt-theme',
  'gn-alt-auth',
]

async function fileToResizedDataUrl(file: File, maxWidth = 400): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Invalid image'))
    image.src = dataUrl
  })
  const scale = Math.min(1, maxWidth / img.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8)
}

export function SettingsPage() {
  const navigate = useNavigate()
  const settings = useSettingsStore((s) => s)
  const setSettings = useSettingsStore((s) => s.setSettings)
  const resetSettings = useSettingsStore((s) => s.resetSettings)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const { toggleTheme: applyTheme } = useTheme()
  const [confirmReset, setConfirmReset] = useState<'reset' | 'clear' | null>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)
  const stampInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (
    file: File | undefined,
    key: 'signatureImage' | 'stampImage',
  ) => {
    if (!file) return
    const dataUrl = await fileToResizedDataUrl(file)
    setSettings({ [key]: dataUrl })
    toast.success('Image updated')
  }

  const handleTheme = () => {
    toggleTheme()
    applyTheme()
  }

  const doResetDemo = () => {
    for (const key of STORE_KEYS) localStorage.removeItem(key)
    setConfirmReset(null)
    toast.success('Demo data will be re-seeded on reload')
    window.location.href = '/dashboard'
  }

  const doClearAll = () => {
    for (const key of STORE_KEYS) localStorage.removeItem(key)
    setConfirmReset(null)
    toast.success('All data cleared')
    window.location.href = '/login'
  }

  return (
    <div>
      <PageHeader title="Settings" description="Company defaults and application options." />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company & Certificate Defaults</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input
                  value={settings.companyName}
                  onChange={(e) => setSettings({ companyName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Company address</Label>
                <Input
                  value={settings.companyAddress}
                  onChange={(e) => setSettings({ companyAddress: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Format number</Label>
                <Input
                  value={settings.formatNumber}
                  onChange={(e) => setSettings({ formatNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Revision number & date</Label>
                <Input
                  value={settings.revisionText}
                  onChange={(e) => setSettings({ revisionText: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Standard / IS reference</Label>
                <Input
                  value={settings.standardReference}
                  onChange={(e) => setSettings({ standardReference: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>License number</Label>
                <Input
                  value={settings.licenseNumber}
                  onChange={(e) => setSettings({ licenseNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Default remarks</Label>
                <Textarea
                  rows={3}
                  value={settings.defaultRemarks}
                  onChange={(e) => setSettings({ defaultRemarks: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Signatures & Stamp (Global)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  { key: 'signatureImage' as const, title: 'Signature Image', ref: signatureInputRef },
                  { key: 'stampImage' as const, title: 'Stamp Image', ref: stampInputRef },
                ]
              ).map(({ key, title, ref }) => (
                <div key={key} className="space-y-2">
                  <Label>{title}</Label>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    {settings[key] ? (
                      <img
                        src={settings[key]}
                        alt={title}
                        className="h-16 w-24 rounded-md border bg-muted object-contain"
                      />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <input
                        ref={ref}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files?.[0], key)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => ref.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload
                      </Button>
                      {settings[key] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSettings({ [key]: '' })}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </div>
                  <div className="text-xs text-muted-foreground">Toggle the interface theme</div>
                </div>
                <Button variant="outline" size="icon" onClick={handleTheme}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setConfirmReset('reset')}
              >
                <Database className="h-4 w-4" />
                Re-seed Demo Data
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setConfirmReset('clear')}
              >
                Clear All Data
              </Button>
              <Separator />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => resetSettings()}>
                  Reset defaults
                </Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => navigate(-1)}>
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={confirmReset !== null}
        onOpenChange={(open) => !open && setConfirmReset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmReset === 'reset' ? 'Re-seed demo data?' : 'Clear all data?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmReset === 'reset'
                ? 'All certificates, heat records and settings will be wiped and the demo data will be re-seeded on reload.'
                : 'All certificates, heat records, settings and the login session will be permanently removed from this browser.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmReset === 'clear' ? 'bg-destructive text-destructive-foreground' : ''}
              onClick={confirmReset === 'reset' ? doResetDemo : doClearAll}
            >
              {confirmReset === 'reset' ? 'Re-seed' : 'Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
