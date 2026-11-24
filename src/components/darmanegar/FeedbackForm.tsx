// Feedback Form — انتقادات، پیشنهادات و نظرات کلی سیستم

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MessageSquare, Send, Loader2, CheckCircle2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const FEEDBACK_TYPES = [
  { value: 'SUGGESTION', label: 'پیشنهاد', icon: '💡', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'COMPLAINT', label: 'انتقاد / شکایت', icon: '⚠️', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'COMPLIMENT', label: 'تشکر و قدردانی', icon: '🙏', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'BUG_REPORT', label: 'گزارش مشکل فنی', icon: '🐛', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'QUESTION', label: 'سوال', icon: '❓', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'OTHER', label: 'سایر', icon: '📝', color: 'bg-gray-50 text-gray-700 border-gray-200' },
]

interface FeedbackFormProps {
  trigger?: React.ReactNode
  defaultType?: string
  userRole?: string
  providerId?: string
}

export function FeedbackForm({ trigger, defaultType = 'SUGGESTION', userRole, providerId }: FeedbackFormProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(defaultType)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!subject.trim() || subject.trim().length < 3) {
      return toast.error('موضوع باید حداقل ۳ کاراکتر باشد')
    }
    if (!message.trim() || message.trim().length < 10) {
      return toast.error('متن بازخورد باید حداقل ۱۰ کاراکتر باشد')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name: name.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          subject: subject.trim(),
          message: message.trim(),
          userRole: userRole || null,
          providerId: providerId || null,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success(data.message || 'بازخورد شما ثبت شد')
      setSubmitted(true)
      // Reset form after 3 seconds
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setName('')
        setPhone('')
        setEmail('')
        setSubject('')
        setMessage('')
        setType(defaultType)
      }, 3000)
    } catch {
      toast.error('خطا در ثبت بازخورد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-primary/30">
            <MessageSquare className="w-4 h-4 ml-2" />
            بازخورد و پیشنهادات
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            بازخورد و پیشنهادات
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="font-bold text-lg mb-1">بازخورد شما ثبت شد</div>
            <div className="text-sm text-muted-foreground">
              از همراهی شما سپاسگزاریم. تیم درمانگر بازخورد شما را بررسی خواهد کرد.
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Feedback type selector */}
            <div>
              <Label>نوع بازخورد</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {FEEDBACK_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`p-2 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                      type === t.value
                        ? t.color + ' font-bold ring-2 ring-primary/30'
                        : 'bg-white border-muted hover:border-primary/30'
                    }`}
                  >
                    <span className="text-lg">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional contact info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نام (اختیاری)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام شما" />
              </div>
              <div>
                <Label>موبایل (اختیاری)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912..."
                  dir="ltr"
                  className="text-right"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <Label>موضوع</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع کوتاه..."
                maxLength={200}
              />
            </div>

            <div>
              <Label>متن بازخورد</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="انتقاد، پیشنهاد یا نظر خود را بنویسید..."
                rows={5}
                maxLength={2000}
              />
              <div className="text-xs text-muted-foreground text-left mt-1">
                {message.length.toLocaleString('fa-IR')} / ۲۰۰۰
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Star className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                بازخورد شما به تیم درمانگر ارسال می‌شود و در اسرع وقت بررسی خواهد شد.
                اطلاعات تماس شما اختیاری است و فقط برای پاسخ‌گویی استفاده می‌شود.
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-teal-gradient"
              size="lg"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ارسال...</>
              ) : (
                <><Send className="w-4 h-4 ml-2" /> ارسال بازخورد</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
