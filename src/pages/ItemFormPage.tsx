import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { toast } from 'sonner'
import { useItemStore } from '@/stores/itemStore'
import { useItemsHydrated } from '@/hooks/useHydrated'

const itemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  partNumber: z.string().min(1, 'Part number is required'),
  material: z.string().min(1, 'Material is required'),
  grade: z.string().min(1, 'Grade is required'),
  description: z.string().optional(),
  unit: z.string().optional(),
})

type ItemFormData = z.infer<typeof itemSchema>

export function ItemFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const hydrated = useItemsHydrated()
  const getItem = useItemStore((s) => s.getItem)
  const addItem = useItemStore((s) => s.addItem)
  const updateItem = useItemStore((s) => s.updateItem)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      partNumber: '',
      material: '',
      grade: '',
      description: '',
      unit: 'Nos.',
    },
  })

  useEffect(() => {
    if (isEdit && hydrated) {
      const item = getItem(id!)
      if (item) {
        reset({
          name: item.name,
          partNumber: item.partNumber,
          material: item.material,
          grade: item.grade,
          description: item.description ?? '',
          unit: item.unit ?? 'Nos.',
        })
      }
    }
  }, [isEdit, hydrated, id, getItem, reset])

  const onSubmit = async (data: ItemFormData) => {
    try {
      if (isEdit) {
        updateItem(id!, data)
        toast.success('Item updated')
      } else {
        addItem(data)
        toast.success('Item created')
      }
      navigate('/items')
    } catch {
      toast.error('Failed to save item')
    }
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title={isEdit ? 'Edit Item' : 'New Item'} />
        <Card>
          <CardContent className="py-10">
            <div className="animate-pulse space-y-4 max-w-md">
              <div className="h-10 rounded-md bg-muted" />
              <div className="h-10 rounded-md bg-muted" />
              <div className="h-10 rounded-md bg-muted" />
              <div className="h-10 rounded-md bg-muted" />
              <div className="h-10 rounded-md bg-muted" />
              <div className="h-10 rounded-md bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Item' : 'New Item'}
        description={isEdit ? 'Update item details' : 'Add a new item for heat records and certificates'}
        actions={
          <Button variant="ghost" asChild>
            <Link to="/items">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Part Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ductile Iron Pump Housing"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partNumber">Part Number *</Label>
              <Input
                id="partNumber"
                {...register('partNumber')}
                placeholder="PH-801"
                disabled={isSubmitting}
              />
              {errors.partNumber && (
                <p className="text-sm text-destructive">{errors.partNumber.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="material">Material *</Label>
              <Input
                id="material"
                {...register('material')}
                placeholder="SG Iron / Ductile Iron"
                disabled={isSubmitting}
              />
              {errors.material && (
                <p className="text-sm text-destructive">{errors.material.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="grade">Grade *</Label>
              <Input
                id="grade"
                {...register('grade')}
                placeholder="IS 1865 SG 500/7"
                disabled={isSubmitting}
              />
              {errors.grade && (
                <p className="text-sm text-destructive">{errors.grade.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                {...register('unit')}
                placeholder="Nos."
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="Optional description"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" asChild>
            <Link to="/items">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Item'}
            <Save className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  )
}