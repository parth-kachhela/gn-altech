import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  type,
  required,
  min,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  min?: number
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      <input
        type={type ?? 'text'}
        min={min}
        className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function SelectField({
  label,
  value,
  items,
  onChange,
  placeholder,
  required,
}: {
  label: string
  value?: string
  items: Array<{ value: string; label: string }>
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      <select
        className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        value={value ?? ''}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>{placeholder ?? 'Select...'}</option>
        {items.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </div>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <textarea
        rows={rows}
        className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function SectionCard({
  title,
  children,
  description,
}: {
  title: string
  children: React.ReactNode
  description?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export function AddButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <Plus className="h-4 w-4 mr-1.5" />
      {label}
    </Button>
  )
}

export function RemoveButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={onClick}
    >
      <X className="h-4 w-4 mr-1.5" />
      {label}
    </Button>
  )
}

export function StepNav({
  onBack,
  onNext,
  nextLabel,
  canNext,
  backLabel = 'Back',
}: {
  onBack: () => void
  onNext: () => void
  nextLabel: string
  canNext?: boolean
  backLabel?: string
}) {
  return (
    <div className="flex justify-between">
      <Button variant="outline" onClick={onBack}>{backLabel}</Button>
      <Button onClick={onNext} disabled={canNext === false}>{nextLabel}</Button>
    </div>
  )
}
