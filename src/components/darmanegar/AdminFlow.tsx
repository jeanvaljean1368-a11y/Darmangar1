// درمانگر Admin Flow
// Admin login + dashboard (verify providers, monitor requests, stats)

'use client'

import { useEffect, useState } from 'react'
import { useViewStore } from '@/stores/useViewStore'
import { Logo, LogoWithText } from './Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowRight, LogOut, ShieldCheck, Users, Inbox, BarChart3, Loader2,
  CheckCircle2, XCircle, Clock, MapPin, FileText, Eye, Coins, TrendingUp
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { DOCUMENT_LABELS, SERVICE_TYPES } from '@/lib/constants'
import type { ServiceType, DocumentType, ProviderStatus } from '@prisma/client'

type Mode = 'login' | 'dashboard'

interface AdminInfo { id: string; username: string }

interface AdminProvider {
  id: string
  firstName: string
  lastName: string
  fullName: string
  nationalId: string
  username: string
  serviceType: ServiceType
  isWoundSpecialist: boolean
  province: string
  city: string
  region: string | null
  status: ProviderStatus
  rejectionReason: string | null
  profilePhoto: string | null
  freeProposalCount: number
  proposalsSubmitted: number
  walletBalance: number
  totalPaid: number
  referralCode: string
  referredById: string | null
  createdAt: string
  documents: { id: string; type: DocumentType; fileUrl: string; fileName: string; verified: boolean; createdAt: string }[]
  _count: { proposals: number; referrals: number; chatsAsProvider: number }
}

interface Stats {
  counts: {
    totalProviders: number
    pendingProviders: number
    approvedProviders: number
    rejectedProviders: number
    totalRequests: number
    activeRequests: number
    selectedRequests: number
    expiredRequests: number
    totalProposals: number
    totalPayments: number
    totalRevenue: number
  }
  byService: { serviceType: ServiceType; count: number }[]
  byProvince: { province: string; count: number }[]
  recentProviders: any[]
  recentRequests: any[]
}

export function AdminFlow() {
  const goHome = useViewStore((s) => s.goHome)
  const [mode, setMode] = useState<Mode>('login')
  const [admin, setAdmin] = useState<AdminInfo | null>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/me', { credentials: 'include' })
        const data = await res.json()
        if (data.admin) {
          setAdmin(data.admin)
          setMode('dashboard')
        }
      } catch {}
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    try { await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }) } catch {}
    setAdmin(null)
    setMode('login')
  }

  if (mode === 'dashboard' && admin) {
    return <AdminDashboard admin={admin} onLogout={handleLogout} onBack={goHome} />
  }

  return <AdminLogin onBack={goHome} onLoggedIn={(a) => { setAdmin(a); setMode('dashboard') }} />
}

// ============== Login ==============
function AdminLogin({ onBack, onLoggedIn }: {
  onBack: () => void
  onLoggedIn: (a: AdminInfo) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) return toast.error('نام کاربری و رمز عبور را وارد کنید')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('به پنل مدیریت خوش آمدید')
      onLoggedIn(data.admin)
    } catch {
      toast.error('خطا در ورود')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/30 to-background">
      <header className="px-4 py-3 border-b bg-white/80 backdrop-blur">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">ورود مدیر سیستم</div>
            <div className="font-bold">پنل مدیریت درمانگر</div>
          </div>
          <Logo size={32} />
        </div>
      </header>
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 flex items-center">
        <Card className="w-full border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              ورود به پنل مدیریت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>نام کاربری</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" dir="ltr" className="text-right" />
            </div>
            <div>
              <Label>رمز عبور</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                dir="ltr"
                className="text-right"
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-teal-gradient" size="lg">
              {loading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ورود...</> : 'ورود'}
            </Button>
            <div className="text-xs text-muted-foreground text-center bg-muted/50 rounded p-2">
              اطلاعات پیش‌فرض: <code dir="ltr">admin</code> / <code dir="ltr">darmanegar1403</code>
              <div className="mt-1">پس از اولین ورود، رمز را تغییر دهید.</div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// ============== Dashboard ==============
function AdminDashboard({ admin, onLogout, onBack }: {
  admin: AdminInfo
  onLogout: () => void
  onBack: () => void
}) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [providers, setProviders] = useState<AdminProvider[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('PENDING')
  const [filterService, setFilterService] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<AdminProvider | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; provider: AdminProvider | null }>({ open: false, provider: null })
  const [rejectReason, setRejectReason] = useState('')

  const fetchProviders = async () => {
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      if (filterService !== 'ALL') params.set('serviceType', filterService)
      const res = await fetch(`/api/admin/providers?${params.toString()}`, { credentials: 'include' })
      const data = await res.json()
      if (data.providers) setProviders(data.providers)
    } catch {}
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'include' })
      const data = await res.json()
      if (!data.error) setStats(data)
    } catch {}
  }

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/requests', { credentials: 'include' })
      const data = await res.json()
      if (data.requests) setRequests(data.requests)
    } catch {}
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await Promise.all([fetchStats(), fetchProviders(), fetchRequests()])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      if (active) await fetchProviders()
    })()
    return () => { active = false }
  }, [filterStatus, filterService])

  const handleVerify = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/providers/${id}/verify`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.error) return toast.error(data.error)
      toast.success('ارائه‌دهنده تأیید شد')
      fetchProviders()
      fetchStats()
    } catch {
      toast.error('خطا در تأیید')
    }
  }

  const handleReject = async () => {
    if (!rejectDialog.provider) return
    if (!rejectReason.trim()) return toast.error('دلیل رد الزامی است')
    try {
      const res = await fetch(`/api/admin/providers/${rejectDialog.provider.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      })
      const data = await res.json()
      if (data.error) return toast.error(data.error)
      toast.success('ارائه‌دهنده رد شد')
      setRejectDialog({ open: false, provider: null })
      setRejectReason('')
      fetchProviders()
      fetchStats()
    } catch {
      toast.error('خطا در رد')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/30 to-background">
      <header className="px-4 py-3 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Logo size={32} />
          <div className="flex-1">
            <div className="font-bold">پنل مدیریت درمانگر</div>
            <div className="text-xs text-muted-foreground">مدیر: {admin.username}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        <Tabs defaultValue="providers">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="providers">
              <Users className="w-4 h-4 ml-1" />
              ارائه‌دهندگان
              {stats && stats.counts.pendingProviders > 0 && (
                <Badge className="mr-1 h-5 px-1 text-[10px] bg-amber-500 text-white">{stats.counts.pendingProviders.toLocaleString('fa-IR')}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Inbox className="w-4 h-4 ml-1" />
              درخواست‌ها
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="w-4 h-4 ml-1" />
              آمار
            </TabsTrigger>
          </TabsList>

          {/* === Providers Tab === */}
          <TabsContent value="providers" className="space-y-3">
            <Card className="border-primary/20">
              <CardContent className="p-3">
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
                      <SelectItem value="PENDING">در انتظار</SelectItem>
                      <SelectItem value="APPROVED">تأیید شده</SelectItem>
                      <SelectItem value="REJECTED">رد شده</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterService} onValueChange={setFilterService}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">همه تخصص‌ها</SelectItem>
                      {SERVICE_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 text-left text-sm text-muted-foreground self-center">
                    {providers.length.toLocaleString('fa-IR')} ارائه‌دهنده
                  </div>
                </div>
              </CardContent>
            </Card>

            {providers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  هیچ ارائه‌دهنده‌ای با این فیلترها یافت نشد
                </CardContent>
              </Card>
            ) : (
              providers.map((p) => (
                <Card key={p.id} className="border-primary/15">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={p.profilePhoto || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{p.fullName}</span>
                          <ProviderStatusBadge status={p.status} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                          <span dir="ltr">{p.username}</span> • کد ملی: <span dir="ltr">{p.nationalId}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{getServiceLabel(p.serviceType)}</Badge>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.province} - {p.city}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          {p.documents.length.toLocaleString('fa-IR')} مدرک • {p._count.proposals.toLocaleString('fa-IR')} پیشنهاد • {p._count.referrals.toLocaleString('fa-IR')} معرفی
                        </div>
                        {p.status === 'REJECTED' && p.rejectionReason && (
                          <div className="text-xs text-destructive mt-1">دلیل رد: {p.rejectionReason}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          ثبت‌نام: {new Date(p.createdAt).toLocaleDateString('fa-IR')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setSelectedProvider(p)}>
                          <Eye className="w-3.5 h-3.5 ml-1" />
                          مشاهده
                        </Button>
                        {p.status === 'PENDING' && (
                          <>
                            <Button size="sm" className="bg-teal-gradient" onClick={() => handleVerify(p.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                              تأیید
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => setRejectDialog({ open: true, provider: p })}>
                              <XCircle className="w-3.5 h-3.5 ml-1" />
                              رد
                            </Button>
                          </>
                        )}
                        {p.status === 'REJECTED' && (
                          <Button size="sm" className="bg-teal-gradient" onClick={() => handleVerify(p.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                            تأیید مجدد
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* === Requests Tab === */}
          <TabsContent value="requests" className="space-y-3">
            {requests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  هنوز درخواستی ثبت نشده است
                </CardContent>
              </Card>
            ) : (
              requests.map((r) => (
                <Card key={r.id} className="border-primary/15">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{getServiceLabel(r.serviceType)}</Badge>
                          <RequestStatusBadge status={r.status} />
                          <span className="text-xs text-muted-foreground">
                            {r.proposalsCount.toLocaleString('fa-IR')} پیشنهاد
                          </span>
                        </div>
                        <div className="text-sm mt-2 font-medium">{r.description}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                          <span>{r.requesterName}</span>
                          <span dir="ltr">{r.requesterPhone}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.province} - {r.city}</span>
                          {r.region && <span>• {r.region}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(r.createdAt).toLocaleString('fa-IR')}
                        </div>
                      </div>
                    </div>
                    {r.proposals?.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-xs font-bold mb-1">پیشنهادها:</div>
                        <div className="space-y-1">
                          {r.proposals.map((p: any) => (
                            <div key={p.id} className="text-xs flex justify-between">
                              <span>{p.provider.firstName} {p.provider.lastName}</span>
                              <span className="font-bold text-primary">{p.price.toLocaleString('fa-IR')} ت</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* === Stats Tab === */}
          <TabsContent value="stats" className="space-y-3">
            {stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatBox label="کل ارائه‌دهندگان" value={stats.counts.totalProviders} icon={<Users className="w-5 h-5" />} />
                  <StatBox label="در انتظار تأیید" value={stats.counts.pendingProviders} icon={<Clock className="w-5 h-5" />} color="text-amber-600" />
                  <StatBox label="تأیید شده" value={stats.counts.approvedProviders} icon={<CheckCircle2 className="w-5 h-5" />} color="text-green-600" />
                  <StatBox label="رد شده" value={stats.counts.rejectedProviders} icon={<XCircle className="w-5 h-5" />} color="text-destructive" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatBox label="کل درخواست‌ها" value={stats.counts.totalRequests} icon={<Inbox className="w-5 h-5" />} />
                  <StatBox label="درخواست فعال" value={stats.counts.activeRequests} icon={<Clock className="w-5 h-5" />} color="text-green-600" />
                  <StatBox label="منجر به چت" value={stats.counts.selectedRequests} icon={<CheckCircle2 className="w-5 h-5" />} color="text-primary" />
                  <StatBox label="منقضی شده" value={stats.counts.expiredRequests} icon={<XCircle className="w-5 h-5" />} color="text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatBox label="کل پیشنهادها" value={stats.counts.totalProposals} icon={<TrendingUp className="w-5 h-5" />} />
                  <StatBox label="تراکنش‌ها" value={stats.counts.totalPayments} icon={<Coins className="w-5 h-5" />} />
                  <StatBox label="صندوق سیستم (تومان)" value={stats.counts.totalRevenue} icon={<Coins className="w-5 h-5" />} color="text-primary" />
                </div>

                {/* System Fund Card - prominent display */}
                <Card className="border-primary/40 bg-teal-gradient-soft">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-gradient flex items-center justify-center text-primary-foreground shrink-0">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">موجودی صندوق سیستم</div>
                      <div className="text-2xl font-bold text-primary persian-nums">
                        {stats.counts.totalRevenue.toLocaleString('fa-IR')}
                        <span className="text-sm font-normal mr-1">تومان</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        حاصل از کسر ۸,۰۰۰ تومان به ازای هر پیشنهاد غیررایگان ارائه‌دهندگان
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-xs text-muted-foreground">تعداد تراکنش</div>
                      <div className="text-lg font-bold persian-nums">
                        {stats.counts.totalPayments.toLocaleString('fa-IR')}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-sm">ارائه‌دهندگان بر اساس تخصص</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.byService.map((s) => (
                        <div key={s.serviceType} className="flex justify-between items-center">
                          <span className="text-sm">{getServiceLabel(s.serviceType)}</span>
                          <Badge variant="secondary">{s.count.toLocaleString('fa-IR')}</Badge>
                        </div>
                      ))}
                      {stats.byService.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center">داده‌ای موجود نیست</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-sm">استان‌های فعال (۱۰ استان برتر)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.byProvince.map((p) => (
                        <div key={p.province} className="flex justify-between items-center">
                          <span className="text-sm">{p.province}</span>
                          <Badge variant="secondary">{p.count.toLocaleString('fa-IR')}</Badge>
                        </div>
                      ))}
                      {stats.byProvince.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center">داده‌ای موجود نیست</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Provider details dialog */}
      <Dialog open={!!selectedProvider} onOpenChange={(open) => !open && setSelectedProvider(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>جزئیات ارائه‌دهنده</DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedProvider.profilePhoto || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {selectedProvider.firstName.charAt(0)}{selectedProvider.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-lg">{selectedProvider.fullName}</div>
                  <div className="text-sm text-muted-foreground">
                    {getServiceLabel(selectedProvider.serviceType)} • {selectedProvider.province} - {selectedProvider.city}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    کد ملی: <span dir="ltr">{selectedProvider.nationalId}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    نام کاربری: <span dir="ltr">{selectedProvider.username}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">پیشنهادهای رایگان:</div>
                  <div className="font-bold">{selectedProvider.freeProposalCount.toLocaleString('fa-IR')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">پیشنهادهای ثبت‌شده:</div>
                  <div className="font-bold">{selectedProvider.proposalsSubmitted.toLocaleString('fa-IR')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">حساب مالی:</div>
                  <div className="font-bold">{selectedProvider.walletBalance.toLocaleString('fa-IR')} ت</div>
                </div>
                <div>
                  <div className="text-muted-foreground">واریز به صندوق:</div>
                  <div className="font-bold">{selectedProvider.totalPaid.toLocaleString('fa-IR')} ت</div>
                </div>
                <div>
                  <div className="text-muted-foreground">کد معرف:</div>
                  <div className="font-mono text-xs" dir="ltr">{selectedProvider.referralCode}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">معرفی‌ها:</div>
                  <div className="font-bold">{selectedProvider._count.referrals.toLocaleString('fa-IR')} نفر</div>
                </div>
              </div>

              <div>
                <div className="font-bold mb-2">مدارک بارگذاری‌شده</div>
                <div className="grid grid-cols-2 gap-3">
                  {selectedProvider.documents.map((doc) => (
                    <div key={doc.id} className="border rounded p-2">
                      <div className="text-sm font-medium mb-1 flex items-center justify-between">
                        {DOCUMENT_LABELS[doc.type]}
                        {doc.verified ? (
                          <Badge className="bg-green-100 text-green-700 text-[10px]">تأیید شده</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">بررسی نشده</Badge>
                        )}
                      </div>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                        <img
                          src={doc.fileUrl}
                          alt={DOCUMENT_LABELS[doc.type]}
                          className="w-full h-32 object-cover rounded"
                        />
                      </a>
                      <div className="text-xs text-muted-foreground mt-1">{doc.fileName}</div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedProvider.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-teal-gradient" onClick={() => { handleVerify(selectedProvider.id); setSelectedProvider(null) }}>
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                    تأیید ارائه‌دهنده
                  </Button>
                  <Button variant="outline" className="flex-1 text-destructive border-destructive/30" onClick={() => {
                    setRejectDialog({ open: true, provider: selectedProvider })
                    setSelectedProvider(null)
                  }}>
                    <XCircle className="w-4 h-4 ml-1" />
                    رد ارائه‌دهنده
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => {
        setRejectDialog({ open, provider: open ? rejectDialog.provider : null })
        if (!open) setRejectReason('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رد ارائه‌دهنده</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>دلیل رد</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثلاً: مدرک کارشناسی پرستاری نامشخص است"
              />
            </div>
            <Button onClick={handleReject} className="w-full bg-destructive">
              <XCircle className="w-4 h-4 ml-1" />
              تأیید و رد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// === Helpers ===
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  if (status === 'APPROVED') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">تأیید شده</Badge>
  if (status === 'REJECTED') return <Badge variant="destructive" className="text-xs">رد شده</Badge>
  return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">در انتظار</Badge>
}

function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'فعال', cls: 'bg-green-100 text-green-700' },
    SELECTED: { label: 'منجر به چت', cls: 'bg-primary/15 text-primary' },
    EXPIRED: { label: 'منقضی', cls: 'bg-muted text-muted-foreground' },
    CANCELLED: { label: 'لغو شده', cls: 'bg-destructive/10 text-destructive' },
    COMPLETED: { label: 'تکمیل شده', cls: 'bg-muted text-muted-foreground' },
  }
  const v = map[status] || { label: status, cls: 'bg-muted' }
  return <Badge variant="secondary" className={`text-[10px] ${v.cls}`}>{v.label}</Badge>
}

function StatBox({ label, value, icon, color = '' }: {
  label: string
  value: number
  icon: React.ReactNode
  color?: string
}) {
  return (
    <Card className="border-primary/15">
      <CardContent className="p-3 text-center">
        <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
        <div className={`text-xl font-bold ${color}`}>{value.toLocaleString('fa-IR')}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

function getServiceLabel(s: ServiceType): string {
  const found = SERVICE_TYPES.find((x) => x.value === s)
  return found?.label || s
}
