// درمانگر Requester Flow
// Multi-step: select service → select province/city/region → request form → waiting (countdown + proposals) → chat

'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowRight, ArrowLeft, Syringe, Heart, Bandage, Hand, Activity,
  MapPin, Clock, User, Phone, CheckCircle2, MessageCircle, XCircle,
  Loader2, RefreshCw, Home as HomeIcon, Info, Siren, BadgeCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { SERVICE_TYPES, IRAN_PROVINCES, getCitiesForProvince, getNeighborhoodsForCity, REQUEST_VALIDITY_MINUTES } from '@/lib/constants'
import { LeafletMapPicker } from './LeafletMapPicker'
import { getSocket } from '@/lib/ws-client'
import type { ServiceType } from '@prisma/client'

type Step = 'service' | 'location' | 'form' | 'waiting' | 'chat'

interface Proposal {
  id: string
  price: number
  message: string | null
  createdAt: string
  provider: {
    id: string
    firstName: string
    lastName: string
    serviceType: string
    province: string
    city: string
    region: string | null
    profilePhoto: string | null
    freeProposalCount: number
    proposalsSubmitted: number
  }
}

interface RequestInfo {
  id: string
  requesterToken: string
  serviceType: ServiceType
  province: string
  city: string
  region: string | null
  description: string
  expiresAt: string
  status: string
  remainingSeconds: number
  proposals: Proposal[]
  chatId?: string
  selectedProviderId?: string | null
}

export function RequesterFlow() {
  const goHome = useViewStore((s) => s.goHome)
  const [step, setStep] = useState<Step>('service')
  const [serviceType, setServiceType] = useState<ServiceType | null>(null)
  const [province, setProvince] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [region, setRegion] = useState<string>('') // محله

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  // Request state
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Check for resume request on mount
  useEffect(() => {
    try {
      const resume = localStorage.getItem('darmanegar_resume_request')
      if (resume) {
        const data = JSON.parse(resume)
        localStorage.removeItem('darmanegar_resume_request')
        if (data.requestId && data.token) {
          fetch(`/api/request/${data.requestId}?t=${data.token}`)
            .then((res) => res.json())
            .then((d) => {
              if (d.request) {
                const now = new Date()
                const remaining = d.request.status === 'ACTIVE'
                  ? Math.max(0, Math.floor((new Date(d.request.expiresAt).getTime() - now.getTime()) / 1000))
                  : 0
                setRequestInfo({
                  id: d.request.id,
                  requesterToken: data.token,
                  serviceType: d.request.serviceType,
                  province: d.request.province,
                  city: d.request.city,
                  region: d.request.neighborhood || d.request.region,
                  description: d.request.description,
                  expiresAt: d.request.expiresAt,
                  status: d.request.status,
                  remainingSeconds: remaining,
                  proposals: d.request.proposals || [],
                  chatId: d.request.chatId,
                  selectedProviderId: d.request.selectedProviderId,
                })
                setStep(d.request.chatId ? 'chat' : 'waiting')
              }
            })
            .catch(() => {})
        }
      }
    } catch {}
  }, [])

  const handleSelectService = (s: ServiceType) => {
    setServiceType(s)
    setStep('location')
  }

  const handleSelectLocation = () => {
    if (!province || !city) {
      toast.error('لطفاً استان و شهر را انتخاب کنید')
      return
    }
    if (!region) {
      toast.error('لطفاً محله را انتخاب کنید')
      return
    }
    setStep('form')
  }

  const handleSubmitRequest = async () => {
    if (!serviceType || !province || !city) return
    if (!name.trim()) return toast.error('نام الزامی است')
    if (!phone.trim()) return toast.error('شماره موبایل الزامی است')
    if (!/^09\d{9}$/.test(toEnglishDigits(phone.trim()))) return toast.error('شماره موبایل معتبر نیست (مثال: 09121234567)')
    if (!description.trim() || description.trim().length < 5) return toast.error('لطفاً توضیحات کاملی از نیاز خود بنویسید')

    setSubmitting(true)
    try {
      const res = await fetch('/api/request/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterName: name.trim(),
          requesterPhone: toEnglishDigits(phone.trim()),
          serviceType,
          province,
          city,
          neighborhood: region, // محله انتخاب‌شده
          description: description.trim(),
          isEmergency,
          latitude,
          longitude,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      setRequestInfo({
        id: data.request.id,
        requesterToken: data.request.requesterToken,
        serviceType: data.request.serviceType,
        province: data.request.province,
        city: data.request.city,
        region: data.request.neighborhood || data.request.region,
        description: data.request.description,
        expiresAt: data.request.expiresAt,
        status: data.request.status,
        remainingSeconds: REQUEST_VALIDITY_MINUTES * 60,
        proposals: [],
      })
      setStep('waiting')
      // Save requester session for "continue" feature
      try {
        localStorage.setItem('darmanegar_requester_session', JSON.stringify({
          requestId: data.request.id,
          token: data.request.requesterToken,
        }))
      } catch {}
      toast.success(data.message || 'درخواست شما ثبت شد')
    } catch (e) {
      toast.error('خطا در ثبت درخواست')
    } finally {
      setSubmitting(false)
    }
  }

  // ====== Waiting step: poll for proposals and listen to WebSocket ======
  useEffect(() => {
    if (step !== 'waiting' || !requestInfo) return

    // Join WebSocket room as requester
    const socket = getSocket()
    socket.emit('requester:join', {
      requestId: requestInfo.id,
      requesterToken: requestInfo.requesterToken,
    })

    const handleNewProposal = (data: any) => {
      if (data.requestId !== requestInfo.id) return
      setRequestInfo((prev) => {
        if (!prev) return prev
        if (prev.proposals.some((p) => p.id === data.proposalId)) return prev
        return {
          ...prev,
          proposals: [
            ...prev.proposals,
            {
              id: data.proposalId,
              price: data.price,
              message: data.message,
              createdAt: new Date().toISOString(),
              provider: {
                id: data.providerId,
                firstName: data.providerName.split(' ')[0] || '',
                lastName: data.providerName.split(' ').slice(1).join(' ') || '',
                serviceType: prev.serviceType,
                province: prev.province,
                city: prev.city,
                region: null,
                profilePhoto: null,
                freeProposalCount: 0,
                proposalsSubmitted: 0,
              },
            },
          ],
        }
      })
      toast.success(`پیشنهاد جدید از ${data.providerName}: ${data.price.toLocaleString('fa-IR')} تومان`)
    }

    const handleRequestClosed = (data: { requestId: string; reason: string }) => {
      if (data.requestId !== requestInfo.id) return
      if (data.reason === 'EXPIRED') {
        setRequestInfo((prev) => prev ? { ...prev, status: 'EXPIRED', remainingSeconds: 0 } : prev)
        toast.info('مهلت درخواست به پایان رسید')
      }
    }

    socket.on('requester:new_proposal', handleNewProposal)
    socket.on('provider:request_closed', handleRequestClosed)

    // Also poll every 5 seconds as fallback
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/request/${requestInfo.id}?t=${requestInfo.requesterToken}`)
        const data = await res.json()
        if (data.error) return
        if (data.request) {
          setRequestInfo((prev) => {
            if (!prev) return prev
            // Merge: prefer WS-added proposals but ensure server-side ones are present
            const serverIds = new Set(data.request.proposals.map((p: Proposal) => p.id))
            const localOnly = prev.proposals.filter((p) => !serverIds.has(p.id))
            const merged = [...data.request.proposals, ...localOnly]
            return {
              ...prev,
              status: data.request.status,
              remainingSeconds: data.request.remainingSeconds,
              proposals: merged,
              chatId: data.request.chatId,
              selectedProviderId: data.request.selectedProviderId,
            }
          })
        }
      } catch (e) {
        // ignore poll errors
      }
    }, 5000)

    return () => {
      socket.off('requester:new_proposal', handleNewProposal)
      socket.off('provider:request_closed', handleRequestClosed)
      clearInterval(pollInterval)
    }
  }, [step, requestInfo?.id])

  // Countdown timer
  useEffect(() => {
    if (step !== 'waiting' || !requestInfo) return
    if (requestInfo.status !== 'ACTIVE') return
    const timer = setInterval(() => {
      setRequestInfo((prev) => {
        if (!prev || prev.status !== 'ACTIVE') return prev
        const remaining = Math.max(0, prev.remainingSeconds - 1)
        return { ...prev, remainingSeconds: remaining }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step, requestInfo?.status])

  const handleSelectProvider = async (proposalId: string) => {
    if (!requestInfo) return
    try {
      const res = await fetch(`/api/request/${requestInfo.id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          requesterToken: requestInfo.requesterToken,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      setRequestInfo((prev) => prev ? {
        ...prev,
        status: 'SELECTED',
        chatId: data.chatId,
        selectedProviderId: data.providerId,
      } : prev)
      setStep('chat')
      toast.success('ارائه‌دهنده انتخاب شد. اکنون می‌توانید چت کنید.')
    } catch (e) {
      toast.error('خطا در انتخاب')
    }
  }

  const handleCancel = async () => {
    if (!requestInfo) return
    try {
      await fetch(`/api/request/${requestInfo.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterToken: requestInfo.requesterToken }),
      })
      // Clear saved session
      localStorage.removeItem('darmanegar_requester_session')
      toast.info('درخواست لغو شد')
      goHome()
    } catch (e) {
      toast.error('خطا در لغو')
    }
  }

  const handleResend = async () => {
    // ارسال مجدد مستقیم با همان داده‌های قبلی
    if (!serviceType || !province || !city || !region) {
      // اگه داده‌ها ناقص هستن، برگرده به فرم
      setRequestInfo(null)
      setStep('form')
      return
    }
    // ارسال مستقیم با داده‌های قبلی
    setRequestInfo(null)
    await handleSubmitRequest()
  }

  // === Render ===
  if (step === 'chat' && requestInfo?.chatId) {
    return (
      <div className="h-screen">
        <ChatPanel
          chatId={requestInfo.chatId}
          requesterToken={requestInfo.requesterToken}
          onBack={() => goHome()}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/30 to-background">
      {/* Header */}
      <header className="px-4 py-3 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => {
            if (step === 'service') goHome()
            else if (step === 'location') setStep('service')
            else if (step === 'form') setStep('location')
            else if (step === 'waiting') handleCancel()
          }}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">درخواست خدمات سلامت</div>
            <StepTitle step={step} />
          </div>
          <Logo size={32} />
        </div>
        {/* Progress bar */}
        <div className="max-w-md mx-auto mt-3 flex gap-1">
          {['service', 'location', 'form', 'waiting'].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${step === s ? 'bg-primary' :
                ['service', 'location', 'form', 'waiting'].indexOf(step) > ['service', 'location', 'form', 'waiting'].indexOf(s as Step)
                  ? 'bg-primary/60' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          {step === 'service' && (
            <motion.div
              key="service"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-center">چه خدمتی نیاز دارید؟</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SERVICE_TYPES.map((s) => (
                    <ServiceOption key={s.value} option={s} onClick={() => handleSelectService(s.value)} />
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'location' && (
            <motion.div
              key="location"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-center flex items-center justify-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    موقعیت خدمت
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <Select value={city || undefined} onValueChange={(v) => { setCity(v); setRegion('') }} disabled={!province}>
                      <SelectTrigger><SelectValue placeholder={province ? 'انتخاب شهر...' : 'ابتدا استان را انتخاب کنید'} /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {getCitiesForProvince(province).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>محله</Label>
                    <Select value={region || undefined} onValueChange={setRegion} disabled={!city}>
                      <SelectTrigger><SelectValue placeholder={city ? 'انتخاب محله...' : 'ابتدا شهر را انتخاب کنید'} /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {getNeighborhoodsForCity(city).map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      فقط ارائه‌دهندگانی که در این محله خدمت‌رسانی می‌کنند، درخواست شما را دریافت خواهند کرد.
                    </p>
                  </div>
                  <Button onClick={handleSelectLocation} className="w-full bg-teal-gradient" size="lg">
                    ادامه
                    <ArrowLeft className="w-4 h-4 mr-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-center">جزئیات درخواست</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ServiceSummary serviceType={serviceType} province={province} city={city} region={region} />
                  <div>
                    <Label>نام و نام خانوادگی</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: علی محمدی" />
                  </div>
                  <div>
                    <Label>شماره موبایل</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09121234567"
                      inputMode="numeric"
                      dir="ltr"
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>توضیحات نیاز</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="مثلاً: مادرم ۷۵ ساله است و نیاز به تزریق انسولین دارد..."
                      rows={4}
                    />
                  </div>

                  {/* Emergency toggle */}
                  <button
                    type="button"
                    onClick={() => setIsEmergency((v) => !v)}
                    className={`w-full text-right p-3 rounded-lg border-2 transition-all flex items-start gap-3 ${
                      isEmergency
                        ? 'border-red-500 bg-red-50'
                        : 'border-muted hover:border-red-300 bg-background'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isEmergency ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500'
                    }`}>
                      <Siren className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">درخواست اورژانسی</span>
                        {isEmergency && <Badge className="bg-red-500 text-white text-[10px]">فعال</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        مهلت کوتاه‌تر (۱۰ دقیقه به جای ۲۰)، اولویت بالاتر و برچسب قرمز برای ارائه‌دهندگان
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${
                      isEmergency ? 'bg-red-500' : 'bg-muted'
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        isEmergency ? 'translate-x-0' : '-translate-x-5'
                      }`} />
                    </div>
                  </button>

                  {/* Map for location */}
                  <div>
                    <Label>موقعیت روی نقشه (اختیاری)</Label>
                    <LeafletMapPicker
                      latitude={latitude}
                      longitude={longitude}
                      onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }}
                    />
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-primary">توجه:</strong> آدرس دقیق را پس از انتخاب ارائه‌دهنده در چت با او به اشتراک بگذارید.
                    </div>
                  </div>
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={submitting}
                    className="w-full bg-teal-gradient"
                    size="lg"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ثبت...</>
                    ) : (
                      <>ثبت و ارسال درخواست</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'waiting' && requestInfo && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <WaitingView
                requestInfo={requestInfo}
                onSelectProvider={handleSelectProvider}
                onCancel={handleCancel}
                onResend={handleResend}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

// === Sub-components ===

function StepTitle({ step }: { step: Step }) {
  const titles: Record<Step, string> = {
    service: 'انتخاب نوع خدمت',
    location: 'انتخاب موقعیت',
    form: 'تکمیل درخواست',
    waiting: 'در انتظار پیشنهادها',
    chat: 'چت با ارائه‌دهنده',
  }
  return <div className="font-bold">{titles[step]}</div>
}

function ServiceOption({ option, onClick }: {
  option: typeof SERVICE_TYPES[0]
  onClick: () => void
}) {
  const icons: Record<string, React.ReactNode> = {
    syringe: <Syringe className="w-6 h-6" />,
    heart: <Heart className="w-6 h-6" />,
    bandage: <Bandage className="w-6 h-6" />,
    hand: <Hand className="w-6 h-6" />,
    activity: <Activity className="w-6 h-6" />,
  }
  return (
    <button
      onClick={onClick}
      className="w-full text-right p-4 rounded-xl border-2 border-primary/15 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3 group"
    >
      <div className="w-12 h-12 rounded-lg bg-teal-gradient-soft flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
        {icons[option.icon]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold">{option.label}</div>
        <div className="text-xs text-muted-foreground truncate">{option.description}</div>
      </div>
      <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0" />
    </button>
  )
}

function ServiceSummary({ serviceType, province, city, region }: {
  serviceType: ServiceType | null
  province: string
  city: string
  region: string
}) {
  const s = SERVICE_TYPES.find((x) => x.value === serviceType)
  if (!s) return null
  return (
    <div className="bg-primary/5 rounded-lg p-3 text-sm">
      <div className="font-bold text-primary mb-1">{s.label}</div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <MapPin className="w-3 h-3" />
        {province} - {city}{region && ` - محله ${region}`}
      </div>
    </div>
  )
}

function WaitingView({ requestInfo, onSelectProvider, onCancel, onResend }: {
  requestInfo: RequestInfo
  onSelectProvider: (proposalId: string) => void
  onCancel: () => void
  onResend: () => void
}) {
  const isActive = requestInfo.status === 'ACTIVE'
  const isExpired = requestInfo.status === 'EXPIRED'
  const minutes = Math.floor(requestInfo.remainingSeconds / 60)
  const seconds = requestInfo.remainingSeconds % 60

  return (
    <div className="space-y-4">
      <Card className={`border-2 ${isActive ? 'border-primary/40 animate-pulse-teal' : 'border-muted'}`}>
        <CardContent className="pt-6 text-center">
          {isActive ? (
            <>
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 rounded-full bg-teal-gradient-soft flex items-center justify-center text-primary">
                  <Clock className="w-8 h-8" />
                </div>
              </div>
              <div className="text-3xl font-bold text-primary tabular-nums persian-nums">
                {String(minutes).padStart(2, '۰')}:{String(seconds).padStart(2, '۰')}
              </div>
              <div className="text-sm text-muted-foreground mt-1">تا پایان مهلت درخواست</div>
              <div className="mt-4 text-sm">
                تعداد پیشنهادها:{' '}
                <Badge variant="secondary" className="text-base">
                  {requestInfo.proposals.length.toLocaleString('fa-IR')} از ۵
                </Badge>
              </div>
            </>
          ) : isExpired ? (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <div className="font-bold mb-1">مهلت درخواست به پایان رسید</div>
              <div className="text-sm text-muted-foreground mb-3">
                {requestInfo.proposals.length === 0
                  ? 'هیچ پیشنهادی دریافت نکردید'
                  : `${requestInfo.proposals.length.toLocaleString('fa-IR')} پیشنهاد دریافت کردید`}
              </div>
              <Button onClick={onResend} className="bg-teal-gradient">
                <RefreshCw className="w-4 h-4 ml-1" />
                ارسال مجدد درخواست
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>

      {requestInfo.proposals.length > 0 && (
        <div>
          <div className="text-sm font-bold mb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            پیشنهادهای دریافت‌شده
          </div>
          <div className="space-y-3">
            {requestInfo.proposals.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-primary/20 hover:border-primary/40 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={p.provider.profilePhoto || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {p.provider.firstName.charAt(0)}{p.provider.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold flex items-center gap-1">
                          {p.provider.firstName} {p.provider.lastName}
                          <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.provider.region ? `منطقه: ${p.provider.region}` : ''}
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-xs text-muted-foreground">پیشنهاد قیمت:</span>
                          <span className="font-bold text-primary text-lg">
                            {p.price.toLocaleString('fa-IR')}
                          </span>
                          <span className="text-xs text-muted-foreground">تومان</span>
                        </div>
                        {p.message && (
                          <div className="mt-2 text-sm bg-muted/50 rounded p-2">
                            {p.message}
                          </div>
                        )}
                        <Button
                          onClick={() => onSelectProvider(p.id)}
                          className="w-full mt-3 bg-teal-gradient"
                          size="sm"
                          disabled={!isActive && !isExpired}
                        >
                          <CheckCircle2 className="w-4 h-4 ml-1" />
                          انتخاب این ارائه‌دهنده
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {requestInfo.proposals.length === 0 && isActive && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <div className="animate-pulse">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
              در حال جستجوی ارائه‌دهندگان...
            </div>
            <div className="text-xs mt-2">
              درخواست شما به ارائه‌دهندگان منطقه ارسال شده است.
            </div>
          </CardContent>
        </Card>
      )}

      {isActive && (
        <Button variant="ghost" onClick={onCancel} className="w-full text-destructive">
          لغو درخواست
        </Button>
      )}
    </div>
  )
}

// Helpers
function toEnglishDigits(s: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  return s.replace(/[۰-۹٠-٩]/g, (c) => String(persian.indexOf(c) >= 0 ? persian.indexOf(c) : arabic.indexOf(c)))
}

// استفاده از REQUEST_VALIDITY_MINUTES از constants.ts (۳۰ دقیقه)
