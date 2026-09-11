import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import { useUsersStore, DEFAULT_ACCOUNTS } from '@/stores/usersStore'
import { deptHome } from '@/lib/permissions'
import { toast } from 'sonner'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const loginWithCredentials = useAuthStore((s) => s.loginWithCredentials)
  const seedDefaultAccounts = useUsersStore((s) => s.seedDefaultAccounts)

  const enter = () => {
    seedDefaultAccounts()
    if (!username.trim() || !password) {
      toast.error('Enter username and password')
      return
    }
    const res = loginWithCredentials(username, password)
    if (!res.ok) {
      toast.error(res.error ?? 'Login failed')
      return
    }
    const user = useAuthStore.getState().user
    toast.success(`Welcome, ${user?.name}`)
    navigate(deptHome(user?.department), { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlaskConical className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">GN ALTECH</CardTitle>
          <CardDescription>Test Certificate Management — sign in with your department account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="e.g. chemical" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') enter() }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') enter() }} />
          </div>
          <Button className="w-full" onClick={enter}>Sign in</Button>
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Demo accounts (multi-browser: log each browser in as a different user):</p>
            {DEFAULT_ACCOUNTS.map((a) => (
              <p key={a.username} className="font-mono">{a.username} / {a.password} — {a.name}</p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
