// درمانگر Admin Flow
// Admin login + dashboard (verify providers, monitor requests, stats)

'use client'

import { useEffect, useState, useCallback } from 'react'
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
  CheckCircle2, XCircle, Clock, MapPin, FileText, Eye, Coins, TrendingUp,
  MessageCircle, RefreshCw, Bell, MessageSquare
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
          <TabsList className="grid grid-cols-6 mb-4">
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
            <TabsTrigger value="revenue">
              <Coins className="w-4 h-4 ml-1" />
              درآمد
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 ml-1" />
              اعلان‌ها
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="w-4 h-4 ml-1" />
              بازخورد
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
                        حاصل از کسر ۱۰,۰۰۰ تومان به ازای هر پیشنهاد غیررایگان ارائه‌دهندگان
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

          {/* === Revenue Tab === */}
          <TabsContent value="revenue" className="space-y-3">
            <RevenueTab />
          </TabsContent>

          {/* === Notifications Tab === */}
          <TabsContent value="notifications" className="space-y-3">
            <NotificationsTab />
          </TabsContent>

          {/* === Feedback Tab === */}
          <TabsContent value="feedback" className="space-y-3">
            <FeedbackTab />
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

// === Revenue Tab ===
function RevenueTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/admin/revenue', { credentials: 'include' })
        const d = await res.json()
        if (active && !d.error) setData(d)
      } catch {}
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [])

  if (loading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" /></div>
  if (!data) return <div className="text-center py-8 text-muted-foreground">داده‌ای موجود نیست</div>

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="درآمد کارمزد" value={data.summary.totalRevenue.toLocaleString('fa-IR')} icon={<Coins className="w-5 h-5" />} color="text-primary" />
        <StatBox label="شارژ کیف پول‌ها" value={data.summary.totalTopups.toLocaleString('fa-IR')} icon={<Coins className="w-5 h-5" />} color="text-green-600" />
        <StatBox label="پرداخت خدمات" value={data.summary.totalServicePayments.toLocaleString('fa-IR')} icon={<TrendingUp className="w-5 h-5" />} />
        <StatBox label="تعداد تراکنش" value={data.summary.totalTransactions.toLocaleString('fa-IR')} icon={<Coins className="w-5 h-5" />} />
      </div>

      {/* Daily revenue chart (text-based) */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm">درآمد ۷ روز اخیر</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.daily?.map((d: any) => (
              <div key={d.date} className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground w-24">{new Date(d.date).toLocaleDateString('fa-IR', { weekday: 'short', day: 'numeric' })}</div>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden relative">
                  <div
                    className="h-full bg-teal-gradient"
                    style={{ width: `${Math.min(100, (d.revenue / Math.max(...data.daily.map((x: any) => x.revenue || 1))) * 100)}%` }}
                  />
                </div>
                <div className="text-xs font-bold w-24 text-left">
                  {d.revenue > 0 ? d.revenue.toLocaleString('fa-IR') + ' ت' : '-'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm">تراکنش‌های اخیر</CardTitle>
        </CardHeader>
        <CardContent>
          {!data.recentTransactions || data.recentTransactions.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">تراکنشی ثبت نشده است</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.recentTransactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{t.description || t.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.provider?.firstName} {t.provider?.lastName} • {new Date(t.createdAt).toLocaleString('fa-IR')}
                    </div>
                  </div>
                  <div className={`font-bold ${t.amount > 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('fa-IR')} ت
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// === SMS Tab ===
function SMSTab() {
  // kept for backward compatibility but not used in UI
  return null
}

// === Notifications Tab ===
function NotificationsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications?limit=50', { credentials: 'include' })
      const d = await res.json()
      if (!d.error) setData(d)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" /></div>
  if (!data) return <div className="text-center py-8 text-muted-foreground">داده‌ای موجود نیست</div>

  const stats = data.stats
  const notifications = data.notifications || []

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="کل اعلان‌ها" value={stats.total.toLocaleString('fa-IR')} icon={<Bell className="w-5 h-5" />} color="text-primary" />
        <StatBox label="خوانده‌شده" value={stats.read.toLocaleString('fa-IR')} icon={<CheckCircle2 className="w-5 h-5" />} color="text-green-600" />
        <StatBox label="خوانده‌نشده" value={stats.unread.toLocaleString('fa-IR')} icon={<Bell className="w-5 h-5" />} color="text-amber-600" />
      </div>

      {/* By type */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm">توزیع اعلان‌ها بر اساس نوع</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.byType && stats.byType.length > 0 ? (
            <div className="space-y-2">
              {stats.byType.map((t: any) => (
                <div key={t.type} className="flex items-center justify-between text-sm">
                  <span>{getNotificationTypeLabel(t.type)}</span>
                  <Badge variant="secondary">{t._count.toLocaleString('fa-IR')}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-4">داده‌ای موجود نیست</div>
          )}
        </CardContent>
      </Card>

      {/* Recent notifications */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>آخرین اعلان‌های ارسالی</span>
            <Button size="sm" variant="ghost" onClick={loadData}>
              <RefreshCw className="w-3.5 h-3.5 ml-1" />
              به‌روزرسانی
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">هنوز اعلانی ثبت نشده است</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.map((n: any) => (
                <div key={n.id} className="text-sm border-b pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{n.title}</div>
                    {!n.read ? (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700">جدید</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-muted text-muted-foreground">خوانده‌شده</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{n.message.substring(0, 100)}...</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    به: {n.provider ? `${n.provider.firstName} ${n.provider.lastName}` : '—'} • {new Date(n.createdAt).toLocaleString('fa-IR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 text-sm">
          <div className="font-bold mb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            سیستم اعلان درون‌برنامه‌ای
          </div>
          <p className="text-xs text-muted-foreground">
            در درمانگر، اعلان‌ها به‌صورت درون‌برنامه‌ای به ارائه‌دهندگان نمایش داده می‌شوند.
            هنگام ورود به اپ، یک زنگوله با شمارنده اعلان‌های خوانده‌نشده در گوشه‌ی بالا نمایش داده می‌شود.
            این سیستم جایگزین SMS است و نیاز به سیم‌کارت یا درگاه SMS ندارد.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    NEW_REQUEST: 'درخواست جدید',
    REQUEST_SELECTED: 'انتخاب ارائه‌دهنده',
    REQUEST_EXPIRED: 'منقضی شدن درخواست',
    SERVICE_COMPLETED: 'تکمیل خدمت',
    WALLET_LOW: 'موجودی کم',
    WALLET_TOPUP: 'شارژ کیف پول',
    DOCUMENT_VERIFIED: 'تأیید مدارک',
    DOCUMENT_REJECTED: 'رد مدارک',
    NEW_RATING: 'امتیاز جدید',
    GENERIC: 'عمومی',
  }
  return labels[type] || type
}

// === Feedback Tab ===
function FeedbackTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')

  const loadData = useCallback(async () => {
    try {
      const params = filterStatus ? `?status=${filterStatus}` : ''
      const res = await fetch(`/api/admin/feedback${params}`, { credentials: 'include' })
      const d = await res.json()
      if (!d.error) setData(d)
    } catch {}
    finally { setLoading(false) }
  }, [filterStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/feedback/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      toast.success('وضعیت به‌روزرسانی شد')
      loadData()
    } catch {
      toast.error('خطا در به‌روزرسانی')
    }
  }

  if (loading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" /></div>
  if (!data) return <div className="text-center py-8 text-muted-foreground">داده‌ای موجود نیست</div>

  const stats = data.stats
  const feedback = data.feedback || []

  const typeLabels: Record<string, string> = {
    SUGGESTION: '💡 پیشنهاد',
    COMPLAINT: '⚠️ انتقاد',
    COMPLIMENT: '🙏 تشکر',
    BUG_REPORT: '🐛 مشکل فنی',
    QUESTION: '❓ سوال',
    OTHER: '📝 سایر',
  }

  const statusLabels: Record<string, string> = {
    NEW: 'جدید',
    REVIEWED: 'در حال بررسی',
    RESOLVED: 'حل شده',
    ARCHIVED: 'آرشیو',
  }

  const statusColors: Record<string, string> = {
    NEW: 'bg-amber-100 text-amber-700',
    REVIEWED: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatBox label="کل بازخوردها" value={stats.total.toLocaleString('fa-IR')} icon={<MessageSquare className="w-5 h-5" />} color="text-primary" />
        <StatBox label="جدید (بررسی نشده)" value={stats.newCount.toLocaleString('fa-IR')} icon={<MessageSquare className="w-5 h-5" />} color="text-amber-600" />
        <StatBox label="حل شده" value={(stats.total - stats.newCount).toLocaleString('fa-IR')} icon={<CheckCircle2 className="w-5 h-5" />} color="text-green-600" />
      </div>

      {/* Filter */}
      <Card className="border-primary/20">
        <CardContent className="p-3">
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={filterStatus === '' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('')}
              className="text-xs"
            >
              همه ({stats.total.toLocaleString('fa-IR')})
            </Button>
            {['NEW', 'REVIEWED', 'RESOLVED', 'ARCHIVED'].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterStatus === s ? 'default' : 'outline'}
                onClick={() => setFilterStatus(s)}
                className="text-xs"
              >
                {statusLabels[s]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feedback list */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>بازخوردهای دریافت‌شده</span>
            <Button size="sm" variant="ghost" onClick={loadData}>
              <RefreshCw className="w-3.5 h-3.5 ml-1" />
              به‌روزرسانی
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">هنوز بازخوردی ثبت نشده است</div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {feedback.map((f: any) => (
                <div key={f.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] ${statusColors[f.status] || ''}`}>
                          {statusLabels[f.status] || f.status}
                        </Badge>
                        <span className="text-sm font-bold">{typeLabels[f.type] || f.type}</span>
                        {f.userRole && (
                          <Badge variant="outline" className="text-[10px]">
                            {f.userRole === 'REQUESTER' ? 'درخواست‌کننده' : f.userRole === 'PROVIDER' ? 'ارائه‌دهنده' : 'بازدیدکننده'}
                          </Badge>
                        )}
                      </div>
                      <div className="font-bold mt-1">{f.subject}</div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {new Date(f.createdAt).toLocaleString('fa-IR')}
                    </div>
                  </div>
                  <div className="text-sm text-foreground bg-muted/30 rounded p-2">
                    {f.message}
                  </div>
                  {(f.name || f.phone || f.email) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      {f.name && <span>👤 {f.name}</span>}
                      {f.phone && <span dir="ltr">📞 {f.phone}</span>}
                      {f.email && <span dir="ltr">✉️ {f.email}</span>}
                    </div>
                  )}
                  {f.adminReply && (
                    <div className="text-xs bg-primary/10 rounded p-2 border border-primary/20">
                      <strong className="text-primary">پاسخ مدیر:</strong> {f.adminReply}
                    </div>
                  )}
                  {/* Quick actions */}
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => handleUpdateStatus(f.id, 'REVIEWED')}>
                      در حال بررسی
                    </Button>
                    <Button size="sm" variant="ghost" className="text-[10px] h-7 text-green-600" onClick={() => handleUpdateStatus(f.id, 'RESOLVED')}>
                      حل شد
                    </Button>
                    <Button size="sm" variant="ghost" className="text-[10px] h-7 text-muted-foreground" onClick={() => handleUpdateStatus(f.id, 'ARCHIVED')}>
                      آرشیو
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
