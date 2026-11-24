// Terms of Service & Privacy Policy modal

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FileText, Shield } from 'lucide-react'

export function TermsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            قوانین و مقررات درمانگر
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
            <h3 className="font-bold text-foreground text-base">۱. مقدمه</h3>
            <p>به پلتفرم درمانگر خوش آمدید. استفاده از این پلتفرم به معنای پذیرش قوانین زیر است. درمانگر یک پلتفرم واسط برای اتصال درخواست‌کنندگان خدمات سلامت به ارائه‌دهندگان معتبر است و خود را ارائه‌دهنده‌ی مستقیم خدمات پزشکی نمی‌داند.</p>

            <h3 className="font-bold text-foreground text-base">۲. تعریف خدمات</h3>
            <p>درمانگر خدمات زیر را واسطه‌گری می‌کند: پرستاری، کمک‌پرستاری (مراقبت از سالمند)، کارشناس زخم، ماساژ درمانی و فیزیوتراپی. ارائه‌دهندگان مستقل هستند و درمانگر صرفاً پلتفرم اتصال را فراهم می‌کند.</p>

            <h3 className="font-bold text-foreground text-base">۳. مسئولیت‌ها</h3>
            <p>۳.۱. ارائه‌دهندگان موظفند مدارک معتبر و قانونی خود را ارائه دهند. تأیید مدارک توسط مدیر درمانگر انجام می‌شود.</p>
            <p>۳.۲. ارائه‌دهندگان مسئولیت کامل کیفیت خدمات ارائه‌شده را بر عهده دارند. درمانگر تضمین‌کننده‌ی کیفیت خدمات نیست.</p>
            <p>۳.۳. درخواست‌کنندگان موظفند اطلاعات صحیح ارائه دهند و در صورت نیاز به کمک فوری، با اورژانس (۱۱۵) تماس بگیرند.</p>

            <h3 className="font-bold text-foreground text-base">۴. کمیسیون و پرداخت</h3>
            <p>۴.۱. ۵ پیشنهاد اول برای هر ارائه‌دهنده رایگان است.</p>
            <p>۴.۲. از پیشنهاد ششم به بعد، به ازای هر پیشنهاد ۱۰,۰۰۰ تومان حق کمیسیون از حساب ارائه‌دهنده کسر می‌شود.</p>
            <p>۴.۳. ارائه‌دهندگان می‌توانند کیف پول خود را شارژ کنند تا نیازی به پرداخت هر بار نباشد.</p>
            <p>۴.۴. مبلغ توافق‌شده بین درخواست‌کننده و ارائه‌دهنده مستقیم و خارج از پلتفرم انجام می‌شود.</p>

            <h3 className="font-bold text-foreground text-base">۵. حریم خصوصی</h3>
            <p>۵.۱. اطلاعات شخصی کاربران (نام، موبایل، کد ملی) محرمانه است و فقط برای ارائه‌ی خدمات استفاده می‌شود.</p>
            <p>۵.۲. آدرس دقیق درخواست‌کننده فقط پس از انتخاب ارائه‌دهنده در چت به اشتراک گذاشته می‌شود.</p>
            <p>۵.۳. چت‌ها جهت پیگیری‌های بعدی تا ۶ ماه در سیستم نگه‌داری می‌شوند.</p>
            <p>۵.۴. اطلاعات مالی ارائه‌دهندگان (کیف پول، تراکنش‌ها) محرمانه است و فقط برای مدیر سیستم قابل مشاهده است.</p>

            <h3 className="font-bold text-foreground text-base">۶. امتیازدهی و نظرات</h3>
            <p>پس از تکمیل هر خدمت، درخواست‌کننده می‌تواند به ارائه‌دهنده امتیاز (۱-۵ ستاره) و نظر بدهد. این امتیاز در پروفایل ارائه‌دهنده نمایش داده می‌شود و در امتیاز اعتبار او محاسبه می‌شود.</p>

            <h3 className="font-bold text-foreground text-base">۷. تمدید مدارک</h3>
            <p>ارائه‌دهندگان موظفند مدارک قابل‌تمدید (کارت نظام پرستاری، صلاحیت حرفه‌ای) را قبل از انقضا تمدید کنند. ارائه‌دهندگان با مدارک منقضی‌شده تا تمدید، به‌صورت موقت غیرفعال می‌شوند.</p>

            <h3 className="font-bold text-foreground text-base">۸. نظام تخلفات</h3>
            <p>۸.۱. ارائه‌دهندگانی که اطلاعات غلط ارائه دهند یا کیفیت خدمات پایینی داشته باشند، پس از بررسی توسط مدیر، ممکن است غیرفعال شوند.</p>
            <p>۸.۲. درخواست‌کنندگان می‌توانند شکایات خود را از طریق بخش «بازخورد و پیشنهادات» ثبت کنند.</p>

            <h3 className="font-bold text-foreground text-base">۹. تغییر قوانین</h3>
            <p>درمانگر حق تغییر قوانین را برای خود محفوظ می‌دارد. تغییرات از طریق اعلان درون‌برنامه‌ای به کاربران اطلاع داده می‌شود.</p>

            <h3 className="font-bold text-foreground text-base">۱۰. ارتباط با ما</h3>
            <p>برای سوالات و پیشنهادات از بخش «بازخورد و پیشنهادات» در صفحه‌ی اصلی استفاده کنید.</p>

            <div className="border-t pt-4 mt-4 text-xs text-center">
              آخرین به‌روزرسانی: ۱۴۰۳
              <br />
              © درمانگر — تمامی حقوق محفوظ است
            </div>
          </div>
        </ScrollArea>
        <div className="mt-2">
          <Button onClick={() => onOpenChange(false)} className="w-full bg-teal-gradient">
            متوجه شدم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
