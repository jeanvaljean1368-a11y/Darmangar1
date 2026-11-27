// درمانگر Home page - entry screen with three options

'use client'

import { useViewStore } from '@/stores/useViewStore'
import { LogoWithText } from './Logo'
import { FeedbackForm } from './FeedbackForm'
import { TermsModal } from './TermsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HeartHandshake, Stethoscope, ShieldCheck, MessageSquare, FileText, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export function Home() {
  const setView = useViewStore((s) => s.setView)
  const [showTerms, setShowTerms] = useState(false)
  const [activeRequest, setActiveRequest] = useState<{ requestId: string; token: string } | null>(null)

  // Check for active requester session
  useEffect(() => {
    try {
      const saved = localStorage.getItem('darmanegar_requester_session')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.requestId && data.token) {
          // Check if the request is still active
          fetch(`/api/request/${data.requestId}?t=${data.token}`)
            .then((res) => res.json())
            .then((d) => {
              if (d.request && (d.request.status === 'ACTIVE' || d.request.status === 'SELECTED')) {
                setActiveRequest({ requestId: data.requestId, token: data.token })
              } else {
                localStorage.removeItem('darmanegar_requester_session')
              }
            })
            .catch(() => {})
        }
      }
    } catch {}
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/30 via-background to-background">
      <header className="px-4 pt-6 pb-2">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <span className="text-xs text-muted-foreground">پلتفرم خدمات سلامت ایران</span>
          <FeedbackForm
            trigger={
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5 ml-1" />
                بازخورد
              </Button>
            }
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Active request banner */}
        {activeRequest && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mb-4"
          >
            <Card className="border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => {
                // Navigate to requester flow with saved request
                localStorage.setItem('darmanegar_resume_request', JSON.stringify(activeRequest))
                setView('requester-flow')
              }}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-gradient flex items-center justify-center text-primary-foreground shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">شما یک درخواست فعال دارید</div>
                  <div className="text-xs text-muted-foreground">برای ادامه و مشاهده پیشنهادها کلیک کنید</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <LogoWithText size={120} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-muted-foreground mb-10 max-w-sm"
        >
          پلتفرم هوشمند اتصال درخواست‌کنندگان خدمات سلامت به ارائه‌دهندگان معتبر در سراسر ایران
        </motion.p>

        <div className="w-full max-w-md space-y-3">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={() => setView('requester-flow')}
              size="lg"
              className="w-full h-24 text-base bg-teal-gradient hover:opacity-95 shadow-lg shadow-primary/20"
            >
              <div className="flex flex-col items-center gap-1">
                <HeartHandshake className="w-7 h-7" />
                <span className="font-bold">ورود درخواست‌کننده خدمات سلامت</span>
                <span className="text-xs opacity-90 font-normal">نیاز به خدمات پرستاری، مراقبتی یا درمانی دارم</span>
              </div>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={() => setView('provider-flow')}
              size="lg"
              variant="outline"
              className="w-full h-24 text-base border-primary/40 bg-white hover:bg-primary/5 shadow-sm"
            >
              <div className="flex flex-col items-center gap-1">
                <Stethoscope className="w-7 h-7 text-primary" />
                <span className="font-bold text-primary">ورود ارائه‌دهنده خدمات سلامت</span>
                <span className="text-xs text-muted-foreground font-normal">پرستار، مراقب، ماساژور یا فیزیوتراپ</span>
              </div>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="pt-2"
          >
            <Button
              onClick={() => setView('admin-flow')}
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
            >
              <ShieldCheck className="w-4 h-4 ml-1" />
              ورود مدیریت
            </Button>
          </motion.div>
        </div>
      </main>

      <footer className="mt-auto px-4 py-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setShowTerms(true)}>
            <FileText className="w-3.5 h-3.5 ml-1" />
            قوانین و مقررات
          </Button>
          <FeedbackForm
            trigger={
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                <MessageSquare className="w-3.5 h-3.5 ml-1" />
                انتقادات و پیشنهادات
              </Button>
            }
          />
        </div>
        <div>© درمانگر — تمامی حقوق محفوظ است</div>
      </footer>

      <TermsModal open={showTerms} onOpenChange={setShowTerms} />
    </div>
  )
}
