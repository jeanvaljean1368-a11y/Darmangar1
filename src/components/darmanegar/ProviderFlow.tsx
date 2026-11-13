// درمانگر Provider Flow
// Multi-mode: login, register, dashboard (with incoming requests, my proposals, chats)

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useViewStore } from '@/stores/useViewStore'
import { Logo } from './Logo'
import { ChatPanel } from './ChatPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  ArrowRight, LogOut, Stethoscope, FileText, Wallet, Users, Clock,
  Inbox, Send, MessageCircle, UserCircle, CheckCircle2, XCircle,
  Loader2, Coins, Gift, MapPin, Phone, RefreshCw, Eye, Upload, Home as HomeIcon
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { SERVICE_TYPES, IRAN_PROVINCES, getCitiesForProvince, REQUIRED_DOCUMENTS, DOCUMENT_LABELS, FREE_PROPOSAL_LIMIT, FREE_PROPOSAL_WITH_REFERRAL, PROPOSAL_FEE } from '@/lib/constants'
import { getSocket } from '@/lib/ws-client'
import type { ServiceType, DocumentType } from '@prisma/client'

type Mode = 'login' | 'register' | 'dashboard' | 'chat'

interface ProviderData {
  id: string
  username: string
  firstName: string
  lastName: string
  nationalId: string
  serviceType: ServiceType
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  province: string
  city: string
  region: string | null
  profilePhoto: string | null
  freeProposalCount: number
  proposalsSubmitted: number
  walletBalance: number
  totalPaid: number
  referralCode: string
  isWoundSpecialist: boolean
  documents: { id: string; type: DocumentType; fileUrl: string; fileName: string; verified: boolean }[]
  chats?: any[]
}

interface ActiveRequest {
  id: string
  serviceType: ServiceType
  province: string
  city: string
  region: string | null
  description: string
  requesterName: string
  createdAt: string
  expiresAt: string
  remainingSeconds: number
  proposalsCount: number
  maxProposals: number
}

interface MyProposal {
  id: string
  price: number
  message: string | null
  createdAt: string
  request: {
    id: string
    serviceType: ServiceType
    province: string
    city: string
    description: string
    requesterName: string
    status: string
  }
}

export function ProviderFlow() {
  const goHome = useViewStore((s) => s.goHome)
  const [mode, setMode] = useState<Mode>('login')
  const [provider, setProvider] = useState<ProviderData | null>(null)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check if already logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/provider/me', { credentials: 'include' })
        const data = await res.json()
        if (data.provider) {
          setProvider(data.provider)
          setMode('dashboard')
        }
      } catch {
        // ignore
      } finally {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/provider/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    setProvider(null)
    setMode('login')
    toast.info('از حساب کاربری خارج شدید')
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50/30 to-background">
        <div className="text-center">
          <Logo size={80} className="mx-auto mb-4" />
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (mode === 'chat' && activeChatId) {
    return (
      <div className="h-screen">
        <ChatPanel
          chatId={activeChatId}
          onBack={() => {
            setActiveChatId(null)
            setMode('dashboard')
          }}
        />
      </div>
    )
  }

  if (mode === 'register') {
    return <ProviderRegister
      onBack={() => setMode('login')}
      onRegistered={(p) => { setProvider(p); setMode('dashboard') }}
    />
  }

  if (mode === 'login' || !provider) {
    return <ProviderLogin
      onBack={goHome}
      onLoggedIn={(p) => { setProvider(p); setMode('dashboard') }}
      onRegisterClick={() => setMode('register')}
    />
  }

  return <ProviderDashboard
    provider={provider}
    onLogout={handleLogout}
    onOpenChat={(chatId) => { setActiveChatId(chatId); setMode('chat') }}
    onProviderUpdate={(p) => setProvider(p)}
  />
}

// ============== Login ==============
function ProviderLogin({ onBack, onLoggedIn, onRegisterClick }: {
  onBack: () => void
  onLoggedIn: (p: ProviderData) => void
  onRegisterClick: () => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) return toast.error('نام کاربری و رمز عبور را وارد کنید')
    setLoading(true)
    try {
      const res = await fetch('/api/provider/login', {
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
      toast.success(`خوش آمدید، ${data.provider.firstName}`)
      onLoggedIn(data.provider)
    } catch (e) {
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
            <div className="text-xs text-muted-foreground">ورود ارائه‌دهنده خدمات</div>
            <div className="font-bold">پنل ارائه‌دهنده سلامت</div>
          </div>
          <Logo size={32} />
        </div>
      </header>
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              ورود به حساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>نام کاربری</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="نام کاربری خود را وارد کنید"
                dir="ltr"
                className="text-right"
              />
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
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-teal-gradient"
              size="lg"
            >
              {loading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ورود...</> : 'ورود'}
            </Button>
            <Separator />
            <div className="text-center text-sm text-muted-foreground">
              هنوز حساب کاربری ندارید؟
            </div>
            <Button onClick={onRegisterClick} variant="outline" className="w-full" size="lg">
              ثبت‌نام به‌عنوان ارائه‌دهنده
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// ============== Register ==============
function ProviderRegister({ onBack, onRegistered }: {
  onBack: () => void
  onRegistered: (p: ProviderData) => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType | ''>('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [docFiles, setDocFiles] = useState<Partial<Record<DocumentType, File>>>({})
  const [loading, setLoading] = useState(false)

  const requiredDocs = serviceType ? REQUIRED_DOCUMENTS[serviceType as ServiceType] : []

  const handleSubmit = async () => {
    if (!firstName || !lastName) return toast.error('نام و نام خانوادگی الزامی است')
    if (!/^\d{10}$/.test(toEnglishDigits(nationalId))) return toast.error('کد ملی باید ۱۰ رقم باشد')
    if (!username || username.length < 4) return toast.error('نام کاربری باید حداقل ۴ کاراکتر باشد')
    if (!password || password.length < 6) return toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد')
    if (!serviceType) return toast.error('نوع خدمت را انتخاب کنید')
    if (!province || !city) return toast.error('استان و شهر را انتخاب کنید')
    if (!profilePhoto) return toast.error('عکس پروفایل الزامی است')

    for (const docType of requiredDocs) {
      if (!docFiles[docType]) {
        return toast.error(`بارگذاری ${DOCUMENT_LABELS[docType]} الزامی است`)
      }
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('firstName', firstName)
      formData.append('lastName', lastName)
      formData.append('nationalId', toEnglishDigits(nationalId))
      formData.append('username', username.toLowerCase())
      formData.append('password', password)
      formData.append('serviceType', serviceType)
      formData.append('province', province)
      formData.append('city', city)
      formData.append('region', region)
      if (referralCode) formData.append('referralCode', referralCode)
      if (profilePhoto) formData.append('profilePhoto', profilePhoto)

      for (const docType of requiredDocs) {
        const f = docFiles[docType]
        if (f) formData.append(`doc_${docType}`, f)
      }

      const res = await fetch('/api/provider/register', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success(data.message || 'ثبت‌نام موفقیت‌آمیز بود')
      onRegistered(data.provider)
    } catch (e: any) {
      toast.error('خطا در ثبت‌نام')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/30 to-background">
      <header className="px-4 py-3 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">ثبت‌نام ارائه‌دهنده</div>
            <div className="font-bold">فرم ثبت‌نام</div>
          </div>
          <Logo size={32} />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              اطلاعات فردی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نام</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="نام" />
              </div>
              <div>
                <Label>نام خانوادگی</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="نام خانوادگی" />
              </div>
            </div>
            <div>
              <Label>کد ملی</Label>
              <Input
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="۰۰۱۲۳۴۵۶۷۸"
                inputMode="numeric"
                dir="ltr"
                className="text-right"
                maxLength={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نام کاربری</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="user123"
                  dir="ltr"
                  className="text-right"
                />
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
                />
              </div>
            </div>

            <div>
              <Label>عکس پروفایل</Label>
              <FileInput file={profilePhoto} onChange={setProfilePhoto} accept="image/*" />
            </div>

            <Separator />

            <div>
              <Label>نوع خدمت</Label>
              <Select value={serviceType || undefined} onValueChange={(v) => setServiceType(v as ServiceType)}>
                <SelectTrigger><SelectValue placeholder="انتخاب تخصص..." /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {serviceType && (
                <p className="text-xs text-muted-foreground mt-1">
                  {SERVICE_TYPES.find((s) => s.value === serviceType)?.description}
                </p>
              )}
            </div>

            <div>
              <Label>استان</Label>
              <Select value={province || undefined} onValueChange={(v) => { setProvince(v); setCity('') }}>
                <SelectTrigger><SelectValue placeholder="انتخاب استان..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {IRAN_PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>شهر</Label>
              <Select value={city || undefined} onValueChange={setCity} disabled={!province}>
                <SelectTrigger><SelectValue placeholder={province ? 'انتخاب شهر...' : 'ابتدا استان را انتخاب کنید'} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {getCitiesForProvince(province).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>منطقه / محله (اختیاری)</Label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="مثلاً: ولیعصر" />
            </div>

            <Separator />

            {requiredDocs.length > 0 && (
              <>
                <div className="text-sm font-bold">مدارک مورد نیاز</div>
                {requiredDocs.map((docType) => (
                  <div key={docType}>
                    <Label>{DOCUMENT_LABELS[docType]}</Label>
                    <FileInput
                      file={docFiles[docType] || null}
                      onChange={(f) => setDocFiles((prev) => ({ ...prev, [docType]: f }))}
                      accept="image/*"
                    />
                  </div>
                ))}
              </>
            )}

            <Separator />

            <div>
              <Label>کد معرف (اختیاری)</Label>
              <Input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="اگر از طرف ارائه‌دهنده‌ای معرفی شده‌اید، کد او را وارد کنید"
              />
              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                <Gift className="w-3 h-3" />
                با وارد کردن کد معرف، ۲ پیشنهاد رایگان اضافه دریافت می‌کنید!
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-teal-gradient"
              size="lg"
            >
              {loading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ثبت...</> : 'تکمیل ثبت‌نام'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              با ثبت‌نام، قوانین درمانگر را می‌پذیرید. مدارک شما پس از تأیید مدیر فعال خواهد شد.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function FileInput({ file, onChange, accept = '*' }: {
  file: File | null
  onChange: (f: File | null) => void
  accept?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] || null
          onChange(f)
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="w-full justify-start"
      >
        <Upload className="w-4 h-4 ml-2" />
        {file ? (
          <span className="truncate text-primary">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
        ) : (
          <span className="text-muted-foreground">انتخاب فایل...</span>
        )}
      </Button>
    </div>
  )
}

// ============== Dashboard ==============
function ProviderDashboard({ provider, onLogout, onOpenChat, onProviderUpdate }: {
  provider: ProviderData
  onLogout: () => void
  onOpenChat: (chatId: string) => void
  onProviderUpdate: (p: ProviderData) => void
}) {
  const [activeRequests, setActiveRequests] = useState<ActiveRequest[]>([])
  const [myProposals, setMyProposals] = useState<MyProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('requests')

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/provider/requests', { credentials: 'include' })
      const data = await res.json()
      if (data.error) return
      setActiveRequests(data.activeRequests || [])
      setMyProposals(data.myProposals || [])
      if (data.provider) {
        onProviderUpdate({ ...provider, ...data.provider })
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [provider, onProviderUpdate])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  // Setup WebSocket for real-time new requests
  useEffect(() => {
    if (provider.status !== 'APPROVED') return

    const socket = getSocket()
    const join = () => {
      socket.emit('provider:join', {
        providerId: provider.id,
        username: provider.username,
        province: provider.province,
        city: provider.city,
        serviceType: provider.serviceType,
      })
    }
    if (socket.connected) join()
    else socket.once('connect', join)

    const handleNewRequest = (data: ActiveRequest) => {
      // Avoid duplicates
      setActiveRequests((prev) => {
        if (prev.some((r) => r.id === data.id)) return prev
        return [data, ...prev]
      })
      toast.success(`درخواست جدید در منطقه شما: ${data.description.substring(0, 40)}...`)
    }

    const handleRequestClosed = (data: { requestId: string; reason: string }) => {
      setActiveRequests((prev) => prev.filter((r) => r.id !== data.requestId))
    }

    socket.on('provider:new_request', handleNewRequest)
    socket.on('provider:request_closed', handleRequestClosed)

    return () => {
      socket.off('provider:new_request', handleNewRequest)
      socket.off('provider:request_closed', handleRequestClosed)
      socket.emit('provider:leave')
    }
  }, [provider.id, provider.status, provider.province, provider.city, provider.serviceType])

  const freeRemaining = Math.max(0, provider.freeProposalCount - provider.proposalsSubmitted)
  const isApproved = provider.status === 'APPROVED'
  const isPending = provider.status === 'PENDING'
  const isRejected = provider.status === 'REJECTED'

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/30 to-background">
      <header className="px-4 py-3 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={provider.profilePhoto || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {provider.firstName.charAt(0)}{provider.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">
              {provider.firstName} {provider.lastName}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {provider.province} - {provider.city}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        <div className="max-w-md mx-auto mt-2">
          <StatusBadge status={provider.status} />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4">
        {/* Pending/Rejected banner */}
        {(isPending || isRejected) && (
          <Card className={`mb-4 border-2 ${isPending ? 'border-amber-300 bg-amber-50' : 'border-destructive/40 bg-destructive/5'}`}>
            <CardContent className="pt-4 text-sm">
              {isPending && (
                <div className="flex items-start gap-2">
                  <Loader2 className="w-4 h-4 text-amber-600 mt-0.5 animate-spin shrink-0" />
                  <div>
                    <div className="font-bold text-amber-800">در انتظار تأیید مدیر</div>
                    <div className="text-amber-700 text-xs mt-1">
                      مدارک شما در حال بررسی توسط مدیر سیستم است. پس از تأیید، می‌توانید به درخواست‌ها پاسخ دهید.
                    </div>
                  </div>
                </div>
              )}
              {isRejected && (
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-destructive">مدارک شما رد شده است</div>
                    <div className="text-destructive/80 text-xs mt-1">
                      دلیل: {provider.rejectionReason || 'نامشخص'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats overview */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard
            icon={<Gift className="w-4 h-4" />}
            label="پیشنهاد رایگان"
            value={freeRemaining.toLocaleString('fa-IR')}
            color="text-primary"
          />
          <StatCard
            icon={<Send className="w-4 h-4" />}
            label="کل پیشنهادها"
            value={provider.proposalsSubmitted.toLocaleString('fa-IR')}
            color="text-foreground"
          />
          <StatCard
            icon={<Wallet className="w-4 h-4" />}
            label="کیف پول"
            value={`${provider.walletBalance.toLocaleString('fa-IR')}`}
            color={provider.walletBalance < 0 ? 'text-destructive' : 'text-foreground'}
          />
        </div>

        {isApproved ? (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="requests" className="text-xs">
                <Inbox className="w-3.5 h-3.5 ml-1" />
                درخواست‌ها
                {activeRequests.length > 0 && (
                  <Badge variant="default" className="mr-1 h-4 px-1 text-[10px]">
                    {activeRequests.length.toLocaleString('fa-IR')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="proposals" className="text-xs">
                <Send className="w-3.5 h-3.5 ml-1" />
                پیشنهادهای من
              </TabsTrigger>
              <TabsTrigger value="chats" className="text-xs">
                <MessageCircle className="w-3.5 h-3.5 ml-1" />
                چت‌ها
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                </div>
              ) : activeRequests.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <div className="font-medium">در حال حاضر درخواست فعالی در منطقه شما نیست</div>
                    <div className="text-xs mt-1">هنگام دریافت درخواست جدید، به شما اعلان می‌شود</div>
                  </CardContent>
                </Card>
              ) : (
                activeRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    provider={provider}
                    onSubmitted={() => fetchData()}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="proposals" className="space-y-3">
              {myProposals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <Send className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <div>هنوز پیشنهادی ثبت نکرده‌اید</div>
                  </CardContent>
                </Card>
              ) : (
                myProposals.map((p) => (
                  <Card key={p.id} className="border-primary/15">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{p.request.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {p.request.requesterName} • {p.request.province} - {p.request.city}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {p.price.toLocaleString('fa-IR')} تومان
                            </Badge>
                            <RequestStatusBadge status={p.request.status} />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(p.createdAt).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="chats" className="space-y-3">
              <ProviderChatsTab provider={provider} onOpenChat={onOpenChat} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <div className="font-medium">پس از تأیید مدیر، درخواست‌های منطقه شما نمایش داده می‌شود</div>
            </CardContent>
          </Card>
        )}

        {/* Referral code section */}
        <Card className="mt-4 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">کد معرف شما</span>
              </div>
            </div>
            <div className="bg-white rounded p-3 text-center">
              <code className="text-primary font-mono text-lg tracking-wider" dir="ltr">
                {provider.referralCode}
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => {
                navigator.clipboard.writeText(provider.referralCode)
                toast.success('کد معرف کپی شد')
              }}
            >
              کپی کد معرف
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              با معرفی هر نفر، ۲ پیشنهاد رایگان برای او و تخفیف پورسانت برای شما
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function ProviderChatsTab({ provider, onOpenChat }: { provider: ProviderData; onOpenChat: (id: string) => void }) {
  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/provider/me', { credentials: 'include' })
        const data = await res.json()
        if (data.provider?.chatsAsProvider) {
          setChats(data.provider.chatsAsProvider)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" /></div>
  }
  if (chats.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <div>هنوز چت فعالی ندارید</div>
          <div className="text-xs mt-1">پس از انتخاب شما توسط درخواست‌کننده، چت ایجاد می‌شود</div>
        </CardContent>
      </Card>
    )
  }
  return (
    <>
      {chats.map((c) => (
        <Card key={c.id} className="border-primary/15 cursor-pointer hover:border-primary/40 transition-all" onClick={() => onOpenChat(c.id)}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {c.request?.requesterName || 'درخواست‌کننده'}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {c.request?.description}
                </div>
                {c.messages?.[0] && (
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    آخرین پیام: {c.messages[0].content}
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 rotate-180" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

function RequestCard({ request, provider, onSubmitted }: {
  request: ActiveRequest
  provider: ProviderData
  onSubmitted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const freeRemaining = Math.max(0, provider.freeProposalCount - provider.proposalsSubmitted)
  const willCharge = freeRemaining === 0
  const minutes = Math.floor(request.remainingSeconds / 60)
  const seconds = request.remainingSeconds % 60

  const handleSubmit = async () => {
    const priceNum = Number(toEnglishDigits(price).replace(/[^0-9]/g, ''))
    if (!priceNum || priceNum < 10000) return toast.error('مبلغ پیشنهادی باید حداقل ۱۰,۰۰۰ تومان باشد')
    setSubmitting(true)
    try {
      const res = await fetch('/api/provider/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId: request.id,
          price: priceNum,
          message: message.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success(data.message || 'پیشنهاد ثبت شد')
      setOpen(false)
      setPrice('')
      setMessage('')
      onSubmitted()
    } catch (e) {
      toast.error('خطا در ثبت پیشنهاد')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <UserCircle className="w-3 h-3" />
              {request.requesterName}
            </div>
            <div className="text-sm mt-1">{request.description}</div>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              <Badge variant="outline" className="text-[10px]">
                {request.region || request.city}
              </Badge>
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {String(minutes).padStart(2, '۰')}:{String(seconds).padStart(2, '۰')}
              </span>
              <span className="text-muted-foreground">
                {request.proposalsCount.toLocaleString('fa-IR')}/{request.maxProposals.toLocaleString('fa-IR')} پیشنهاد
              </span>
            </div>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-teal-gradient" size="sm">
              <Send className="w-4 h-4 ml-1" />
              ثبت پیشنهاد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ثبت پیشنهاد برای درخواست</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded p-3 text-sm">
                <div className="font-medium mb-1">درخواست:</div>
                <div className="text-muted-foreground">{request.description}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {request.requesterName} • {request.province} - {request.city}
                  {request.region && ` - ${request.region}`}
                </div>
              </div>

              {/* Cost notice */}
              <div className={`rounded p-3 text-sm ${willCharge ? 'bg-amber-50 text-amber-800' : 'bg-primary/5 text-primary'}`}>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  {willCharge ? (
                    <span>
                      این پیشنهاد هزینه دارد: <strong>{PROPOSAL_FEE.toLocaleString('fa-IR')} تومان</strong>
                    </span>
                  ) : (
                    <span>
                      این پیشنهاد رایگان است — <strong>{freeRemaining.toLocaleString('fa-IR')}</strong> پیشنهاد رایگان باقی‌مانده
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label>مبلغ پیشنهادی (تومان)</Label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="مثلاً: ۱۰۰,۰۰۰"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div>
                <Label>پیام (اختیاری)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="توضیحات اضافه برای درخواست‌کننده..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-teal-gradient"
              >
                {submitting ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ثبت...</> : 'تأیید و ثبت پیشنهاد'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// === Helpers ===
function StatusBadge({ status }: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
  if (status === 'APPROVED') {
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 ml-1" /> تأیید شده</Badge>
  }
  if (status === 'REJECTED') {
    return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" /> رد شده</Badge>
  }
  return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Loader2 className="w-3 h-3 ml-1" /> در انتظار تأیید</Badge>
}

function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'فعال', cls: 'bg-green-100 text-green-700' },
    SELECTED: { label: 'انتخاب شده', cls: 'bg-primary/15 text-primary' },
    EXPIRED: { label: 'منقضی', cls: 'bg-muted text-muted-foreground' },
    CANCELLED: { label: 'لغو شده', cls: 'bg-destructive/10 text-destructive' },
    COMPLETED: { label: 'تکمیل شده', cls: 'bg-muted text-muted-foreground' },
  }
  const v = map[status] || { label: status, cls: 'bg-muted' }
  return <Badge variant="secondary" className={`text-[10px] ${v.cls}`}>{v.label}</Badge>
}

function StatCard({ icon, label, value, color = '' }: {
  icon: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <Card className="border-primary/15">
      <CardContent className="p-3 text-center">
        <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
        <div className={`font-bold ${color}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

function toEnglishDigits(s: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  return s.replace(/[۰-۹٠-٩]/g, (c) => String(persian.indexOf(c) >= 0 ? persian.indexOf(c) : arabic.indexOf(c)))
}
