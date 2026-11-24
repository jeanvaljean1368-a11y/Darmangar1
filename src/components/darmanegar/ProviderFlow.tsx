// درمانگر Provider Flow
// Multi-mode: login, register, dashboard (with incoming requests, my proposals, chats)

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useViewStore } from '@/stores/useViewStore'
import { Logo } from './Logo'
import { NotificationsBell } from './NotificationsBell'
import { ChatPanel } from './ChatPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  ArrowRight, LogOut, Stethoscope, FileText, Wallet, Users, Clock,
  Inbox, Send, MessageCircle, UserCircle, CheckCircle2, XCircle,
  Loader2, Coins, Gift, MapPin, Phone, RefreshCw, Eye, Upload, Home as HomeIcon,
  BarChart3, TrendingUp, Calendar, Star, CreditCard, ShieldCheck
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { SERVICE_TYPES, IRAN_PROVINCES, getCitiesForProvince, getNeighborhoodsForCity, REQUIRED_DOCUMENTS, DOCUMENT_LABELS, FREE_PROPOSAL_LIMIT, FREE_PROPOSAL_WITH_REFERRAL, PROPOSAL_FEE } from '@/lib/constants'
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
  bio?: string | null
  freeProposalCount: number
  proposalsSubmitted: number
  walletBalance: number
  totalPaid: number
  totalEarnings?: number
  servicesCompleted?: number
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType | ''>('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]) // محله‌های سرویس‌دهی
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
    if (password !== confirmPassword) return toast.error('رمز عبور و تکرار آن یکسان نیستند')
    if (!serviceType) return toast.error('نوع خدمت را انتخاب کنید')
    if (!province || !city) return toast.error('استان و شهر را انتخاب کنید')
    if (neighborhoods.length === 0) return toast.error('حداقل یک محله برای سرویس‌دهی انتخاب کنید')
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
      // محله‌های سرویس‌دهی به‌صورت JSON array
      formData.append('servedNeighborhoods', JSON.stringify(neighborhoods))
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
              <div>
                <Label>تکرار رمز عبور</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  dir="ltr"
                  className={`text-right ${
                    confirmPassword.length > 0
                      ? confirmPassword === password
                        ? 'border-green-500'
                        : 'border-red-500'
                      : ''
                  }`}
                />
                {confirmPassword.length > 0 && (
                  <div className={`text-xs mt-1 flex items-center gap-1 ${
                    confirmPassword === password ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {confirmPassword === password ? (
                      <><CheckCircle2 className="w-3 h-3" /> رمزها مطابقت دارند</>
                    ) : (
                      <><XCircle className="w-3 h-3" /> رمزها مطابقت ندارند</>
                    )}
                  </div>
                )}
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
              <Select value={city || undefined} onValueChange={(v) => { setCity(v); setNeighborhoods([]) }} disabled={!province}>
                <SelectTrigger><SelectValue placeholder={province ? 'انتخاب شهر...' : 'ابتدا استان را انتخاب کنید'} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {getCitiesForProvince(province).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                محله‌های سرویس‌دهی
                {neighborhoods.length > 0 && (
                  <Badge variant="secondary" className="mr-2 text-[10px]">
                    {neighborhoods.length.toLocaleString('fa-IR')} محله انتخاب‌شده
                  </Badge>
                )}
              </Label>
              {!city ? (
                <p className="text-xs text-muted-foreground mt-2">ابتدا شهر را انتخاب کنید تا محله‌ها نمایش داده شوند.</p>
              ) : (
                <NeighborhoodMultiSelect
                  city={city}
                  selected={neighborhoods}
                  onChange={setNeighborhoods}
                />
              )}
              <p className="text-xs text-muted-foreground mt-2">
                فقط درخواست‌های مربوط به محله‌های انتخاب‌شده به شما ارسال می‌شود. می‌توانید چند محله را انتخاب کنید.
              </p>
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
                      accept="image/*,application/pdf"
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

// Multi-select for neighborhoods (toggle-style with badges)
function NeighborhoodMultiSelect({ city, selected, onChange }: {
  city: string
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  const all = getNeighborhoodsForCity(city)

  const toggle = (n: string) => {
    if (selected.includes(n)) {
      onChange(selected.filter((x) => x !== n))
    } else {
      onChange([...selected, n])
    }
  }

  const selectAll = () => onChange(all)
  const clearAll = () => onChange([])

  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground">
          {all.length.toLocaleString('fa-IR')} محله در {city}
        </span>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={selectAll}>
            انتخاب همه
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={clearAll}>
            پاک کردن
          </Button>
        </div>
      </div>
      <ScrollArea className="h-48 rounded border bg-muted/30 p-2">
        <div className="flex flex-wrap gap-1.5">
          {all.map((n) => {
            const isSelected = selected.includes(n)
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isSelected
                    ? 'bg-teal-gradient border-primary text-primary-foreground shadow-sm'
                    : 'bg-white border-border text-foreground hover:border-primary/50'
                }`}
              >
                {n}
                {isSelected && <span className="mr-1">✓</span>}
              </button>
            )
          })}
        </div>
      </ScrollArea>
      {selected.length > 0 && (
        <div className="mt-2 text-[10px] text-primary">
          {selected.length.toLocaleString('fa-IR')} محله انتخاب‌شده — درخواست‌ها فقط از این محله‌ها دریافت می‌شود
        </div>
      )}
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
    <div className="relative">
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
        variant={file ? "outline" : "outline"}
        onClick={() => inputRef.current?.click()}
        className={`w-full justify-start relative ${
          file ? 'border-green-500 bg-green-50' : ''
        }`}
      >
        <Upload className="w-4 h-4 ml-2" />
        {file ? (
          <>
            <span className="truncate text-primary font-medium">{file.name}</span>
            <span className="text-xs text-muted-foreground mr-1">({(file.size / 1024).toFixed(0)} KB)</span>
          </>
        ) : (
          <span className="text-muted-foreground">انتخاب فایل...</span>
        )}
        {file && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        )}
      </Button>
      {file && (
        <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          فایل با موفقیت انتخاب شد — برای تغییر، دوباره کلیک کنید
        </div>
      )}
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
  const [providerServedNeighborhoods, setProviderServedNeighborhoods] = useState<string[]>([])

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
        if (data.provider.servedNeighborhoods) {
          setProviderServedNeighborhoods(data.provider.servedNeighborhoods)
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [provider, onProviderUpdate])

  useEffect(() => {
    fetchData()
    // polling interval — در Vercel (بدون WebSocket) سریع‌تر
    const interval = setInterval(fetchData, 10000)
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
        servedNeighborhoods: providerServedNeighborhoods,
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
  }, [provider.id, provider.status, provider.province, provider.city, provider.serviceType, providerServedNeighborhoods])

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
          <NotificationsBell />
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
            label="حساب مالی"
            value={`${provider.walletBalance.toLocaleString('fa-IR')}`}
            color={provider.walletBalance < 0 ? 'text-destructive' : 'text-foreground'}
          />
        </div>

        {isApproved ? (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-7 mb-4">
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
                پیشنهادها
              </TabsTrigger>
              <TabsTrigger value="chats" className="text-xs">
                <MessageCircle className="w-3.5 h-3.5 ml-1" />
                چت‌ها
              </TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs">
                <Wallet className="w-3.5 h-3.5 ml-1" />
                کیف پول
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs">
                <BarChart3 className="w-3.5 h-3.5 ml-1" />
                آمار
              </TabsTrigger>
              <TabsTrigger value="credentials" className="text-xs">
                <ShieldCheck className="w-3.5 h-3.5 ml-1" />
                اعتبار
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <FileText className="w-3.5 h-3.5 ml-1" />
                سوابق
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

            <TabsContent value="wallet" className="space-y-3">
              <ProviderWalletTab provider={provider} />
            </TabsContent>

            <TabsContent value="stats" className="space-y-3">
              <ProviderStatsTab provider={provider} />
            </TabsContent>

            <TabsContent value="credentials" className="space-y-3">
              <ProviderCredentialsTab provider={provider} />
            </TabsContent>

            <TabsContent value="history" className="space-y-3">
              <ProviderHistoryTab provider={provider} />
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

// ============== Wallet Tab ==============
function ProviderWalletTab({ provider }: { provider: ProviderData }) {
  const [wallet, setWallet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/provider/wallet', { credentials: 'include' })
        const data = await res.json()
        if (active && data.wallet) setWallet(data.wallet)
      } catch {}
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [])

  const handleTopup = async () => {
    const amount = Number(toEnglishDigits(topupAmount).replace(/[^0-9]/g, ''))
    if (!amount || amount < 1000) return toast.error('مبلغ باید حداقل ۱,۰۰۰ تومان باشد')
    setTopupLoading(true)
    try {
      const res = await fetch('/api/provider/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      // Redirect to payment gateway (or mock auto-approves)
      if (data.redirectUrl) {
        toast.success('در حال انتقال به درگاه پرداخت...')
        // For mock: redirect to mock-success URL (auto-completes)
        // For real: redirect to Zarinpal/IdPay
        if (data.redirectUrl.startsWith('/')) {
          // Internal URL (mock)
          window.location.href = data.redirectUrl
        } else {
          window.location.href = data.redirectUrl
        }
      }
    } catch {
      toast.error('خطا در ایجاد درخواست پرداخت')
    } finally {
      setTopupLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-3">
      {/* Balance card */}
      <Card className="border-primary/30 bg-teal-gradient-soft">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">موجودی فعلی حساب</div>
          <div className={`text-3xl font-bold mt-1 ${wallet?.balance < 0 ? 'text-destructive' : 'text-primary'}`}>
            {(wallet?.balance || 0).toLocaleString('fa-IR')}
            <span className="text-sm font-normal mr-1">تومان</span>
          </div>
          {wallet?.balance < 0 && (
            <div className="text-xs text-destructive mt-2 bg-red-50 rounded p-2">
              حساب شما منفی است. برای ادامه ارسال پیشنهاد، کیف پول خود را شارژ کنید.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div>
              <div className="text-muted-foreground">کل شارژ شده</div>
              <div className="font-bold">{(wallet?.totalPaid || 0).toLocaleString('fa-IR')} ت</div>
            </div>
            <div>
              <div className="text-muted-foreground">کل درآمد خدمات</div>
              <div className="font-bold">{(wallet?.totalEarnings || 0).toLocaleString('fa-IR')} ت</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top up */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            شارژ کیف پول
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>مبلغ شارژ (تومان)</Label>
            <Input
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="مثلاً: ۵۰,۰۰۰"
              inputMode="numeric"
              dir="ltr"
              className="text-right"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[50000, 100000, 200000, 500000].map((amt) => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setTopupAmount(amt.toLocaleString('fa-IR'))}
              >
                {amt.toLocaleString('fa-IR')}
              </Button>
            ))}
          </div>
          <Button
            onClick={handleTopup}
            disabled={topupLoading}
            className="w-full bg-teal-gradient"
          >
            {topupLoading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ایجاد...</> : 'پرداخت و شارژ'}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            در حالت توسعه، پرداخت به‌صورت خودکار تأیید می‌شود. در محیط واقعی به درگاه پرداخت منتقل می‌شوید.
          </p>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm">تراکنش‌های اخیر</CardTitle>
        </CardHeader>
        <CardContent>
          {!wallet?.transactions || wallet.transactions.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">هنوز تراکنشی ثبت نشده است</div>
          ) : (
            <div className="space-y-2">
              {wallet.transactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{t.description}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString('fa-IR')}</div>
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

// ============== Stats Tab ==============
function ProviderStatsTab({ provider }: { provider: ProviderData }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        // Use admin stats endpoint via provider — actually we need a dedicated provider stats endpoint
        // For now, fetch proposals & ratings
        const [propRes, meRes] = await Promise.all([
          fetch('/api/provider/requests', { credentials: 'include' }),
          fetch('/api/provider/me', { credentials: 'include' }),
        ])
        const propData = await propRes.json()
        const meData = await meRes.json()
        if (active) {
          setStats({
            myProposals: propData.myProposals || [],
            provider: meData.provider,
          })
        }
      } catch {}
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [])

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" /></div>
  }

  const totalProposals = stats?.myProposals?.length || 0
  const acceptedProposals = stats?.myProposals?.filter((p: any) => p.request.status === 'SELECTED' || p.request.status === 'COMPLETED').length || 0
  const completedProposals = stats?.myProposals?.filter((p: any) => p.request.status === 'COMPLETED').length || 0
  const totalEarnings = stats?.myProposals
    ?.filter((p: any) => p.request.status === 'COMPLETED')
    .reduce((sum: number, p: any) => sum + p.price, 0) || 0
  const acceptanceRate = totalProposals > 0 ? Math.round((acceptedProposals / totalProposals) * 100) : 0

  return (
    <div className="space-y-3">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="کل پیشنهادها" value={totalProposals.toLocaleString('fa-IR')} icon={<Send className="w-5 h-5" />} />
        <StatBox label="پیشنهادهای پذیرفته‌شده" value={acceptedProposals.toLocaleString('fa-IR')} icon={<CheckCircle2 className="w-5 h-5" />} color="text-green-600" />
        <StatBox label="خدمات انجام‌شده" value={completedProposals.toLocaleString('fa-IR')} icon={<TrendingUp className="w-5 h-5" />} color="text-primary" />
        <StatBox label="نرخ موفقیت" value={`${acceptanceRate.toLocaleString('fa-IR')}٪`} icon={<BarChart3 className="w-5 h-5" />} color="text-amber-600" />
      </div>

      {/* Earnings */}
      <Card className="border-primary/30 bg-teal-gradient-soft">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">درآمد کل از خدمات انجام‌شده</div>
          <div className="text-3xl font-bold text-primary mt-1">
            {totalEarnings.toLocaleString('fa-IR')}
            <span className="text-sm font-normal mr-1">تومان</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            میانگین به ازای هر خدمت: {completedProposals > 0 ? Math.round(totalEarnings / completedProposals).toLocaleString('fa-IR') : '۰'} تومان
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <WorkingHoursEditor providerId={provider.id} />

      {/* Profile photo */}
      <ProfilePhotoEditor provider={provider} onUpdate={(photo) => onProviderUpdate({ ...provider, profilePhoto: photo })} />

      {/* Bio editor */}
      <BioEditor provider={provider} />

      {/* Recent proposals */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm">آخرین پیشنهادها</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.myProposals || stats.myProposals.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">هنوز پیشنهادی ثبت نکرده‌اید</div>
          ) : (
            <div className="space-y-2">
              {stats.myProposals.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.request.description}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('fa-IR')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{p.price.toLocaleString('fa-IR')} ت</span>
                    <RequestStatusBadge status={p.request.status} />
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

// Working hours editor
function WorkingHoursEditor({ providerId }: { providerId: string }) {
  const [hours, setHours] = useState<{ dayOfWeek: number; fromHour: number; toHour: number }[]>([])
  const [savedHours, setSavedHours] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/provider/working-hours', { credentials: 'include' })
        const data = await res.json()
        if (active && data.hours) {
          setSavedHours(data.hours)
          // Initialize editable hours from saved data
          const initial = data.hours.map((h: any) => ({
            dayOfWeek: h.dayOfWeek,
            fromHour: h.fromHour,
            toHour: h.toHour,
          }))
          setHours(initial)
        }
      } catch {}
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [])

  const days = [
    { value: 0, label: 'شنبه' },
    { value: 1, label: 'یکشنبه' },
    { value: 2, label: 'دوشنبه' },
    { value: 3, label: 'سه‌شنبه' },
    { value: 4, label: 'چهارشنبه' },
    { value: 5, label: 'پنجشنبه' },
    { value: 6, label: 'جمعه' },
  ]

  const toggleDay = (day: number) => {
    if (hours.some((h) => h.dayOfWeek === day)) {
      setHours(hours.filter((h) => h.dayOfWeek !== day))
    } else {
      setHours([...hours, { dayOfWeek: day, fromHour: 8, toHour: 20 }])
    }
  }

  const updateTime = (day: number, field: 'fromHour' | 'toHour', value: number) => {
    setHours(hours.map((h) => h.dayOfWeek === day ? { ...h, [field]: value } : h))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/provider/working-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hours }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('ساعات کاری ذخیره شد')
      setSavedHours(data.hours || [])
    } catch {
      toast.error('خطا در ذخیره')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          ساعات کاری
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          درخواست‌ها فقط در ساعات کاری شما به‌صورت real-time نمایش داده می‌شوند. (درخواست‌های اورژانسی همیشه نمایش داده می‌شوند.)
        </p>
        {days.map((d) => {
          const active = hours.some((h) => h.dayOfWeek === d.value)
          const dayHours = hours.find((h) => h.dayOfWeek === d.value)
          return (
            <div key={d.value} className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`w-24 text-right py-1 px-2 rounded text-xs font-medium ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                {d.label}
              </button>
              {active && dayHours ? (
                <div className="flex items-center gap-1">
                  <select
                    value={dayHours.fromHour}
                    onChange={(e) => updateTime(d.value, 'fromHour', Number(e.target.value))}
                    className="border rounded px-1 py-0.5 text-xs"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                      <option key={h} value={h}>{h.toLocaleString('fa-IR')}:۰۰</option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">تا</span>
                  <select
                    value={dayHours.toHour}
                    onChange={(e) => updateTime(d.value, 'toHour', Number(e.target.value))}
                    className="border rounded px-1 py-0.5 text-xs"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>{h.toLocaleString('fa-IR')}:۰۰</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">تعطیل</span>
              )}
            </div>
          )
        })}
        <Button onClick={handleSave} disabled={saving} size="sm" className="w-full mt-3 bg-teal-gradient">
          {saving ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ذخیره...</> : 'ذخیره ساعات کاری'}
        </Button>
      </CardContent>
    </Card>
  )
}

// Bio editor
// Profile photo editor
function ProfilePhotoEditor({ provider, onUpdate }: { provider: ProviderData; onUpdate: (photo: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!file) return toast.error('فایل عکس انتخاب کنید')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch('/api/provider/profile/photo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('عکس پروفایل به‌روزرسانی شد')
      onUpdate(data.profilePhoto)
      setFile(null)
    } catch {
      toast.error('خطا در آپلود')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-sm">عکس پروفایل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-20 h-20">
            <AvatarImage src={provider.profilePhoto || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {provider.firstName.charAt(0)}{provider.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <FileInput file={file} onChange={setFile} accept="image/*" />
            {file && (
              <Button
                onClick={handleUpload}
                disabled={loading}
                size="sm"
                className="w-full mt-2 bg-teal-gradient"
              >
                {loading ? <><Loader2 className="w-3 h-3 ml-1 animate-spin" /> در حال آپلود...</> : 'ذخیره عکس جدید'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BioEditor({ provider }: { provider: ProviderData }) {
  const [bio, setBio] = useState(provider.bio || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (bio.length > 500) return toast.error('معرفی نباید بیشتر از ۵۰۰ کاراکتر باشد')
    setSaving(true)
    try {
      const res = await fetch('/api/provider/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bio }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('معرفی ذخیره شد')
    } catch {
      toast.error('خطا در ذخیره')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-sm">معرفی کوتاه</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="مثلاً: پرستار رسمی با ۱۵ سال سابقه در مراقبت از سالمندان و تزریقات..."
          rows={3}
          maxLength={500}
        />
        <div className="text-xs text-muted-foreground text-left">
          {bio.length.toLocaleString('fa-IR')} / ۵۰۰ کاراکتر
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="w-full bg-teal-gradient">
          {saving ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ذخیره...</> : 'ذخیره معرفی'}
        </Button>
      </CardContent>
    </Card>
  )
}

// Helper for StatBox
function StatBox({ label, value, icon, color = '' }: {
  label: string
  value: string
  icon: React.ReactNode
  color?: string
}) {
  return (
    <Card className="border-primary/15">
      <CardContent className="p-3 text-center">
        <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
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
                <div className="flex items-start gap-2">
                  <Coins className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    {willCharge ? (
                      <>
                        <div>
                          این پیشنهاد هزینه دارد: <strong>{PROPOSAL_FEE.toLocaleString('fa-IR')} تومان</strong>
                        </div>
                        <div className="text-xs mt-1 opacity-90">
                          مبلغ در زمان ارسال پیشنهاد از حساب شما کسر و به صندوق سیستم واریز می‌شود.
                          ارتباطی به قبول شدن پیشنهاد توسط درخواست‌کننده ندارد.
                        </div>
                      </>
                    ) : (
                      <span>
                        این پیشنهاد رایگان است — <strong>{freeRemaining.toLocaleString('fa-IR')}</strong> پیشنهاد رایگان باقی‌مانده
                      </span>
                    )}
                  </div>
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

// ============== Credentials Tab ==============
function ProviderCredentialsTab({ provider }: { provider: ProviderData }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState<string | null>(null) // document type being renewed
  const [renewFile, setRenewFile] = useState<File | null>(null)
  const [renewLoading, setRenewLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/provider/credentials', { credentials: 'include' })
      const d = await res.json()
      if (!d.error) setData(d)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRenew = async (docType: string) => {
    if (!renewFile) return toast.error('لطفاً فایل مدرک جدید را انتخاب کنید')
    setRenewLoading(true)
    try {
      const formData = new FormData()
      formData.append('documentType', docType)
      formData.append('file', renewFile)
      formData.append('expiryMonths', '12')

      const res = await fetch('/api/provider/credentials/renew', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const d = await res.json()
      if (d.error) {
        toast.error(d.error)
        return
      }
      toast.success(d.message || 'مدرک تمدید شد')
      setRenewing(null)
      setRenewFile(null)
      loadData()
    } catch {
      toast.error('خطا در تمدید مدرک')
    } finally {
      setRenewLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" /></div>
  }

  const trust = data?.trustScore
  const credentials = data?.credentials || []

  return (
    <div className="space-y-3">
      {/* Trust Score Card */}
      {trust && (
        <Card className="border-primary/30 bg-teal-gradient-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-gradient flex items-center justify-center text-3xl shrink-0">
                {trust.levelIcon}
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">امتیاز اعتبار شما</div>
                <div className={`text-3xl font-bold ${trust.levelColor}`}>
                  {trust.score.toLocaleString('fa-IR')}
                  <span className="text-sm font-normal text-muted-foreground mr-1">/ ۱۰۰</span>
                </div>
                <div className={`text-sm font-bold ${trust.levelColor}`}>
                  سطح {trust.levelLabel}
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs text-muted-foreground">خدمات انجام‌شده</div>
                <div className="text-xl font-bold">{trust.totalServices.toLocaleString('fa-IR')}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  امتیاز: {trust.averageRating.toLocaleString('fa-IR')} ({trust.totalRatings.toLocaleString('fa-IR')} نظر)
                </div>
              </div>
            </div>
            {/* Score breakdown */}
            <div className="mt-4 grid grid-cols-5 gap-2 text-center">
              <ScoreBar label="مدارک" value={trust.breakdown.documentsVerified} max={30} />
              <ScoreBar label="خدمات" value={trust.breakdown.servicesCompleted} max={20} />
              <ScoreBar label="امتیاز" value={trust.breakdown.averageRating} max={30} />
              <ScoreBar label="قدمت" value={trust.breakdown.membershipDuration} max={10} />
              <ScoreBar label="انقضا" value={trust.breakdown.credentialsCurrent} max={10} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credentials List */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            مدارک و گواهینامه‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {credentials.map((cred: any) => (
            <div key={cred.type} className={`border rounded-lg p-3 ${cred.statusColor}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-bold text-sm">{cred.label}</div>
                  {cred.fileName && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      <a href={cred.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {cred.fileName}
                      </a>
                    </div>
                  )}
                  <div className="text-xs mt-1 font-medium">
                    {cred.statusLabel}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {cred.verified ? (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 ml-1" />
                      تأیید شده
                    </Badge>
                  ) : cred.status === 'NOT_UPLOADED' ? (
                    <Badge variant="outline" className="text-[10px]">آپلود نشده</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">در انتظار تأیید</Badge>
                  )}
                  {(cred.status === 'EXPIRED' || cred.status === 'EXPIRING_SOON') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 mt-1"
                      onClick={() => setRenewing(renewing === cred.type ? null : cred.type)}
                    >
                      <Upload className="w-3 h-3 ml-1" />
                      تمدید
                    </Button>
                  )}
                </div>
              </div>

              {/* Renewal form */}
              {renewing === cred.type && (
                <div className="mt-3 pt-3 border-t space-y-2 bg-white/50 rounded-lg p-2">
                  <Label className="text-xs">فایل مدرک جدید را آپلود کنید:</Label>
                  <FileInput
                    file={renewFile}
                    onChange={setRenewFile}
                    accept="image/*,application/pdf"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRenew(cred.type)}
                      disabled={!renewFile || renewLoading}
                      className="bg-teal-gradient flex-1"
                    >
                      {renewLoading ? <><Loader2 className="w-3 h-3 ml-1 animate-spin" /> در حال آپلود...</> : 'ثبت مدرک جدید'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRenewing(null); setRenewFile(null) }}>
                      انصراف
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    پس از آپلود، مدرک جدید توسط مدیر بررسی و تأیید می‌شود.
                  </p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* How to increase trust score */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="font-bold text-sm flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            چگونه اعتبار خود را افزایش دهید؟
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">۳۰ امتیاز</span>
              <span>— تأیید همه‌ی مدارک توسط مدیر سیستم</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">۲۰ امتیاز</span>
              <span>— انجام خدمات (۱ امتیاز به ازای هر خدمت، حداکثر ۲۰)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">۳۰ امتیاز</span>
              <span>— دریافت امتیاز بالا از درخواست‌کنندگان (۶ امتیاز به ازای هر ستاره)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">۱۰ امتیاز</span>
              <span>— قدمت عضویت (۱ امتیاز به ازای هر ماه، حداکثر ۱۰)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">۱۰ امتیاز</span>
              <span>— تمدید به‌موقع مدارک منقضی‌شونده</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🥉</span> برنزی (۳۰+)
              <span className="text-lg mr-2">🥈</span> نقره‌ای (۵۰+)
              <span className="text-lg mr-2">🥇</span> طلایی (۷۰+)
              <span className="text-lg mr-2">💎</span> پلاتینیوم (۸۵+)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-teal-gradient" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] font-bold mt-0.5">{value.toLocaleString('fa-IR')}/{max.toLocaleString('fa-IR')}</div>
    </div>
  )
}

// ============== History Tab ==============
function ProviderHistoryTab({ provider }: { provider: ProviderData }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showCompleted, setShowCompleted] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/provider/history?filter=${filter}`, { credentials: 'include' })
      const d = await res.json()
      if (!d.error) setData(d)
    } catch {}
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" /></div>
  }

  const stats = data?.stats
  const proposals = data?.proposals || []
  const completedServices = data?.completedServices || []

  return (
    <div className="space-y-3">
      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-primary/15">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-primary">{stats?.total?.toLocaleString('fa-IR') || '۰'}</div>
            <div className="text-[10px] text-muted-foreground">کل پیشنهادها</div>
          </CardContent>
        </Card>
        <Card className="border-primary/15">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-green-600">{stats?.completed?.toLocaleString('fa-IR') || '۰'}</div>
            <div className="text-[10px] text-muted-foreground">خدمات انجام‌شده</div>
          </CardContent>
        </Card>
        <Card className="border-primary/15">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-amber-500">{stats?.avgRating?.toLocaleString('fa-IR') || '۰'}</div>
            <div className="text-[10px] text-muted-foreground">میانگین امتیاز ({stats?.totalRatings?.toLocaleString('fa-IR') || '۰'})</div>
          </CardContent>
        </Card>
      </div>

      {/* Section toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={showCompleted ? 'default' : 'outline'}
          onClick={() => setShowCompleted(true)}
          className="text-xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
          خدمات انجام‌شده ({completedServices.length.toLocaleString('fa-IR')})
        </Button>
        <Button
          size="sm"
          variant={!showCompleted ? 'default' : 'outline'}
          onClick={() => setShowCompleted(false)}
          className="text-xs"
        >
          <Send className="w-3.5 h-3.5 ml-1" />
          همه‌ی پیشنهادها ({stats?.total?.toLocaleString('fa-IR') || '۰'})
        </Button>
      </div>

      {/* Filter buttons (only for proposals) */}
      {!showCompleted && (
        <div className="flex gap-1 flex-wrap">
          {[
            { value: 'all', label: 'همه' },
            { value: 'completed', label: 'تکمیل‌شده' },
            { value: 'active', label: 'فعال / پذیرفته‌شده' },
            { value: 'expired', label: 'منقضی' },
            { value: 'cancelled', label: 'لغو‌شده' },
          ].map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'default' : 'ghost'}
              onClick={() => setFilter(f.value)}
              className="text-[10px] h-7"
            >
              {f.label}
            </Button>
          ))}
        </div>
      )}

      {/* Completed services section */}
      {showCompleted ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              خدمات انجام‌شده
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedServices.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                هنوز خدمتی تکمیل نشده است
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {completedServices.map((s: any) => (
                  <div key={s.id} className="border rounded-lg p-3 bg-green-50/30 border-green-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                          {getServiceLabel(s.serviceType)}
                          {s.isEmergency && <Badge className="bg-red-500 text-white text-[10px]">اورژانسی</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{s.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {s.requesterName} • {s.province} - {s.city}
                          {s.neighborhood && ` • محله ${s.neighborhood}`}
                        </div>
                        {/* Rating */}
                        {s.rating && (
                          <div className="mt-2 bg-amber-50 rounded p-2 border border-amber-200">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-500">{'★'.repeat(s.rating.stars)}{'☆'.repeat(5 - s.rating.stars)}</span>
                              <span className="text-xs font-bold text-amber-700">
                                {s.rating.stars.toLocaleString('fa-IR')} ستاره
                              </span>
                            </div>
                            {s.rating.comment && (
                              <div className="text-xs text-muted-foreground mt-1">«{s.rating.comment}»</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-left shrink-0">
                        <div className="font-bold text-primary">
                          {s.price.toLocaleString('fa-IR')}
                        </div>
                        <div className="text-[10px] text-muted-foreground">تومان</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {s.completedAt ? new Date(s.completedAt).toLocaleDateString('fa-IR') : new Date(s.createdAt).toLocaleDateString('fa-IR')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Total earnings */}
            {completedServices.length > 0 && (
              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">جمع درآمد از خدمات انجام‌شده:</span>
                <span className="font-bold text-primary text-lg">
                  {stats?.totalEarnings?.toLocaleString('fa-IR') || '۰'} تومان
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* All proposals section */
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                سوابق پیشنهادها
              </span>
              <Button size="sm" variant="ghost" onClick={loadData}>
                <RefreshCw className="w-3.5 h-3.5 ml-1" />
                به‌روزرسانی
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proposals.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
                هنوز پیشنهادی ثبت نکرده‌اید
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {proposals.map((p: any) => (
                  <div key={p.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold">{getServiceLabel(p.serviceType)}</span>
                          <HistoryStatusBadge status={p.requestStatus} />
                          {p.isEmergency && <Badge className="bg-red-500 text-white text-[10px]">اورژانسی</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">{p.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {p.requesterName} • {p.neighborhood ? `محله ${p.neighborhood}` : `${p.province} - ${p.city}`}
                        </div>
                        {p.message && (
                          <div className="text-xs bg-muted/30 rounded p-1.5 mt-1 text-muted-foreground">
                            پیام شما: {p.message}
                          </div>
                        )}
                        {p.rating && (
                          <div className="text-xs mt-1 text-amber-600 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {p.rating.stars.toLocaleString('fa-IR')} ستاره دریافت کردید
                          </div>
                        )}
                      </div>
                      <div className="text-left shrink-0">
                        <div className="font-bold text-primary">
                          {p.price.toLocaleString('fa-IR')}
                        </div>
                        <div className="text-[10px] text-muted-foreground">تومان</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(p.createdAt).toLocaleDateString('fa-IR')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function HistoryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'فعال', cls: 'bg-green-100 text-green-700' },
    SELECTED: { label: 'پذیرفته‌شده', cls: 'bg-primary/15 text-primary' },
    EXPIRED: { label: 'منقضی', cls: 'bg-muted text-muted-foreground' },
    CANCELLED: { label: 'لغو‌شده', cls: 'bg-red-100 text-red-700' },
    COMPLETED: { label: 'تکمیل‌شده', cls: 'bg-green-100 text-green-700' },
  }
  const v = map[status] || { label: status, cls: 'bg-muted' }
  return <Badge variant="secondary" className={`text-[10px] ${v.cls}`}>{v.label}</Badge>
}

function getServiceLabel(serviceType: string): string {
  const labels: Record<string, string> = {
    NURSING: 'پرستاری',
    CAREGIVER: 'کمک‌پرستاری',
    WOUND_SPECIALIST: 'کارشناس زخم',
    MASSAGE: 'ماساژ درمانی',
    PHYSIOTHERAPY: 'فیزیوتراپی',
  }
  return labels[serviceType] || serviceType
}

function toEnglishDigits(s: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  return s.replace(/[۰-۹٠-٩]/g, (c) => String(persian.indexOf(c) >= 0 ? persian.indexOf(c) : arabic.indexOf(c)))
}
