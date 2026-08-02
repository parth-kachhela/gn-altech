import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

export function LoginPage() {
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const enter = (demo: boolean) => {
    login(name, demo)
    toast.success(demo ? 'Entering demo mode' : `Welcome, ${name || 'User'}`)
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlaskConical className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">GN ALTECH</CardTitle>
          <CardDescription>Test Certificate Generation System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Operator name</Label>
            <Input
              id="name"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') enter(true)
              }}
            />
          </div>
          <Button className="w-full" onClick={() => enter(false)}>
            Sign in
          </Button>
          <Separator />
          <div className="text-center">
            <Button variant="outline" className="w-full" onClick={() => enter(true)}>
              Continue in Demo Mode
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              All data stays in your browser. No server is required.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
