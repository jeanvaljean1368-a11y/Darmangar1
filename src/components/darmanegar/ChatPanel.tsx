// درمانگر Chat Panel — shared between requester and provider

'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Send, ArrowRight, Phone, MapPin, AlertTriangle, Star, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getSocket } from '@/lib/ws-client'

export interface ChatMessage {
  id: string
  sender: 'REQUESTER' | 'PROVIDER' | 'SYSTEM'
  content: string
  createdAt: string
}

export interface ChatInfo {
  id: string
  isProvider: boolean
  provider: {
    id: string
    firstName: string
    lastName: string
    serviceType: string
    province: string
    city: string
    profilePhoto: string | null
  }
  request: {
    id: string
    serviceType: string
    province: string
    city: string
    region: string | null
    neighborhood: string | null
    description: string
    requesterName: string
    requesterPhone?: string
    address: string | null
    status: string
  }
  serviceStatus: 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  completedAt: string | null
  completedBy: string | null
  messages: ChatMessage[]
}

interface ChatPanelProps {
  chatId: string
  requesterToken?: string
  onBack?: () => void
}

export function ChatPanel({ chatId, requesterToken, onBack }: ChatPanelProps) {
  const [chat, setChat] = useState<ChatInfo | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [hasRated, setHasRated] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load chat
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const url = `/api/chat/${chatId}/messages${requesterToken ? `?t=${requesterToken}` : ''}`
        const res = await fetch(url, { credentials: 'include' })
        const data = await res.json()
        if (!mounted) return
        if (data.error) {
          toast.error(data.error)
          return
        }
        setChat(data.chat)
      } catch (e) {
        toast.error('خطا در بارگذاری چت')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
  }, [chatId, requesterToken])

  // Setup WebSocket listener for new messages
  useEffect(() => {
    const socket = getSocket()
    const handler = (msg: ChatMessage & { chatId: string }) => {
      if (msg.chatId !== chatId) return
      setChat((prev) => {
        if (!prev) return prev
        // Avoid duplicates
        if (prev.messages.some((m) => m.id === msg.id)) return prev
        return { ...prev, messages: [...prev.messages, msg] }
      })
    }
    socket.on('chat:message', handler)
    // Join chat room
    socket.emit('chat:join', {
      chatId,
      requestId: chat?.request?.id,
      as: chat?.isProvider ? 'PROVIDER' : 'REQUESTER',
    })
    return () => {
      socket.off('chat:message', handler)
    }
  }, [chatId, chat?.isProvider, chat?.request?.id])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chat?.messages])

  const sendMessage = async () => {
    if (!input.trim() || !chat) return
    setSending(true)
    try {
      const res = await fetch(`/api/chat/${chatId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: input.trim(),
          requesterToken,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      // Add to messages (WS should also broadcast, but ensure local addition)
      setChat((prev) => prev ? {
        ...prev,
        messages: [...prev.messages, data.message],
      } : prev)
      setInput('')
    } catch (e) {
      toast.error('خطا در ارسال پیام')
    } finally {
      setSending(false)
    }
  }

  const handleComplete = async () => {
    if (!chat) return
    setCompleting(true)
    try {
      const res = await fetch(`/api/chat/${chatId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requesterToken }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success(data.message || 'خدمت تکمیل شد')
      // Update chat state
      setChat((prev) => prev ? {
        ...prev,
        serviceStatus: 'COMPLETED',
        completedAt: new Date().toISOString(),
        completedBy: data.completedBy,
      } : prev)
      // If requester and provider completed, show rating dialog
      if (!chat.isProvider && data.completedBy === 'PROVIDER') {
        setShowRating(true)
      }
    } catch {
      toast.error('خطا در تکمیل خدمت')
    } finally {
      setCompleting(false)
    }
  }

  const submitRating = async () => {
    if (rating === 0) return toast.error('لطفاً امتیاز را انتخاب کنید')
    if (!chat) return
    setSubmittingRating(true)
    try {
      const res = await fetch('/api/rating/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: chat.request.id,
          requesterToken,
          stars: rating,
          comment: ratingComment.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success(data.message || 'امتیاز شما ثبت شد')
      setShowRating(false)
      setHasRated(true)
    } catch {
      toast.error('خطا در ثبت امتیاز')
    } finally {
      setSubmittingRating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">در حال بارگذاری چت...</div>
      </div>
    )
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        چت یافت نشد
      </div>
    )
  }

  const otherPartyName = chat.isProvider
    ? chat.request.requesterName
    : `${chat.provider.firstName} ${chat.provider.lastName}`

  const serviceLabel = getServiceLabel(chat.request.serviceType)

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      {/* Retention warning (red) */}
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-red-700">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <p className="text-xs font-medium">
          چت‌ها جهت پیگیری‌های بعدی تا ۶ ماه حذف نخواهند شد.
        </p>
      </div>

      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur px-4 py-3 flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
        )}
        <Avatar className="w-10 h-10">
          <AvatarImage src={chat.provider.profilePhoto || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {chat.isProvider ? chat.request.requesterName.charAt(0) : chat.provider.firstName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{otherPartyName}</div>
          <div className="text-xs text-muted-foreground truncate">
            {serviceLabel} • {chat.request.province} - {chat.request.city}
            {chat.request.region && ` • محله ${chat.request.region}`}
          </div>
        </div>
        {chat.isProvider && chat.request.requesterPhone && (
          <a href={`tel:${chat.request.requesterPhone}`}>
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4 ml-1" />
              تماس
            </Button>
          </a>
        )}
      </div>

      {/* Request summary */}
      <div className="bg-primary/5 border-b px-4 py-2 text-xs">
        <div className="text-muted-foreground mb-1">درخواست خدمت:</div>
        <div className="text-foreground">{chat.request.description}</div>
        {chat.request.region && (
          <div className="flex items-center gap-1 text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />
            منطقه: {chat.request.region}
          </div>
        )}
        {chat.isProvider && chat.request.address && (
          <div className="flex items-center gap-1 text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />
            آدرس: {chat.request.address}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="px-4 py-4 space-y-3" ref={scrollRef}>
          {chat.messages.map((msg) => {
            const isMe = chat.isProvider
              ? msg.sender === 'PROVIDER'
              : msg.sender === 'REQUESTER'
            const isSystem = msg.sender === 'SYSTEM'
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-full max-w-[80%] text-center">
                    {msg.content}
                  </div>
                </div>
              )
            }
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-bl-sm'
                      : 'bg-muted text-foreground rounded-br-sm'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                  <div className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
          {chat.messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              هنوز پیامی رد و بدل نشده. اولین پیام را ارسال کنید.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Service completion bar */}
      {chat.serviceStatus === 'ONGOING' && (
        <div className="border-t bg-primary/5 px-3 py-2 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            خدمت در حال انجام است
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleComplete}
            disabled={completing}
            className="border-primary/40 text-primary"
          >
            {completing ? (
              <><Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> در حال ثبت...</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5 ml-1" /> تکمیل خدمت</>
            )}
          </Button>
        </div>
      )}
      {chat.serviceStatus === 'COMPLETED' && (
        <div className="border-t bg-green-50 px-3 py-2 flex items-center justify-between gap-2">
          <div className="text-xs text-green-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            خدمت تکمیل شد
            {chat.completedAt && (
              <span className="text-green-600/70 mr-1">— {new Date(chat.completedAt).toLocaleString('fa-IR')}</span>
            )}
          </div>
          {!chat.isProvider && !hasRated && (
            <Button
              size="sm"
              onClick={() => setShowRating(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Star className="w-3.5 h-3.5 ml-1" />
              امتیاز به ارائه‌دهنده
            </Button>
          )}
          {!chat.isProvider && hasRated && (
            <Badge className="bg-amber-100 text-amber-700 text-xs">
              <Star className="w-3 h-3 ml-1" />
              امتیاز ثبت شد
            </Badge>
          )}
        </div>
      )}

      {/* Rating dialog */}
      <Dialog open={showRating} onOpenChange={setShowRating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              امتیاز به {chat.provider.firstName} {chat.provider.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              لطفاً به کیفیت خدمت ارائه‌شده امتیاز بدهید. نظرات شما به دیگران کمک می‌کند.
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-transform hover:scale-110 ${
                    star <= rating ? 'text-amber-500' : 'text-muted-foreground/30'
                  }`}
                  aria-label={`${star} ستاره`}
                >
                  ★
                </button>
              ))}
            </div>
            <div>
              <Label>نظر شما (اختیاری)</Label>
              <Textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="تجربه خود را با دیگران به اشتراک بگذارید..."
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRating(false)}
                className="flex-1"
              >
                بعداً
              </Button>
              <Button
                onClick={submitRating}
                disabled={submittingRating || rating === 0}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                {submittingRating ? (
                  <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ثبت...</>
                ) : (
                  'ثبت امتیاز'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Input */}
      <div className="border-t bg-white px-3 py-2 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="پیام خود را بنویسید..."
          disabled={sending}
          className="flex-1"
          maxLength={1000}
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          size="icon"
          className="bg-teal-gradient shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
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
