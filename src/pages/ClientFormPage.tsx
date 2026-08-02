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
import { useClientStore } from '@/stores/clientStore'
import { useClientsHydrated } from '@/hooks/useHydrated'

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

export function ClientFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const hydrated = useClientsHydrated()
  const getClient = useClientStore((s) => s.getClient)
  const addClient = useClientStore((s) => s.addClient)
  const updateClient = useClientStore((s) => s.updateClient)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      location: '',
      contactPerson: '',
      email: '',
      phone: '',
      gstin: '',
      address: '',
    },
  })

  useEffect(() => {
    if (isEdit && hydrated) {
      const client = getClient(id!)
      if (client) {
        reset({
          name: client.name,
          location: client.location ?? '',
          contactPerson: client.contactPerson ?? '',
          email: client.email ?? '',
          phone: client.phone ?? '',
          gstin: client.gstin ?? '',
          address: client.address ?? '',
        })
      }
    }
  }, [isEdit, hydrated, id, getClient, reset])

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (isEdit) {
        updateClient(id!, data)
        toast.success('Client updated')
      } else {
        addClient(data)
        toast.success('Client created')
      }
      navigate('/clients')
    } catch {
      toast.error('Failed to save client')
    }
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title={isEdit ? 'Edit Client' : 'New Client'} />
        <Card>
          <CardContent className="py-10">
            <div className="animate-pulse space-y-4 max-w-md">
              <div className="h-10 rounded-md bg-muted" />
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
        title={isEdit ? 'Edit Client' : 'New Client'}
        description={isEdit ? 'Update client details' : 'Add a new client for certificates and heat records'}
        actions={
          <Button variant="ghost" asChild>
            <Link to="/clients">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Apex Engineering Private Limited"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="Pune, Maharashtra"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                {...register('contactPerson')}
                placeholder="John Doe"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="contact@example.com"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+91 98765 43210"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                {...register('gstin')}
                placeholder="27AAAAA0000A1Z5"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="123 Industrial Area, Pune"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" asChild>
            <Link to="/clients">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Client'}
            <Save className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  )
}