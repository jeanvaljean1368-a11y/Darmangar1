// درمانگر Home page - entry screen with three options

'use client'

import { useViewStore } from '@/stores/useViewStore'
import { LogoWithText } from './Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HeartHandshake, Stethoscope, ShieldCheck, ArrowLeft, Activity, MapPin, Users, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

export function Home() {
  const setView = useViewStore((s) => s.setView)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/30 via-background to-background">
      <header className="px-4 pt-6 pb-2">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <span className="text-xs text-muted-foreground">پلتفرم خدمات سلامت ایران</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
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
          className="text-center text-muted-foreground mb-8 max-w-sm"
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
                <span className="font-bold">درخواست‌کننده خدمات سلامت</span>
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
                <span className="font-bold text-primary">ارائه‌دهنده خدمات سلامت</span>
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
              ورود مدیر سیستم
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 grid grid-cols-3 gap-2 w-full max-w-md text-center"
        >
          <Feature icon={<MapPin className="w-4 h-4" />} title="۳۱ استان" />
          <Feature icon={<Users className="w-4 h-4" />} title="۵ پیشنهاد" />
          <Feature icon={<Clock className="w-4 h-4" />} title="۲۰ دقیقه" />
        </motion.div>
      </main>

      <footer className="mt-auto px-4 py-4 text-center text-xs text-muted-foreground">
        © درمانگر — تمامی حقوق محفوظ است
      </footer>
    </div>
  )
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Card className="border-primary/20 bg-white/60">
      <CardContent className="p-2 flex flex-col items-center gap-1">
        <span className="text-primary">{icon}</span>
        <span className="text-xs font-medium">{title}</span>
      </CardContent>
    </Card>
  )
}
