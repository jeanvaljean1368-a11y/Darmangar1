// Notifications bell icon with badge + dropdown panel

'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Check, CheckCheck, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { getNotificationStyle } from '@/lib/notification'
import type { NotificationType } from '@prisma/client'

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  readAt: string | null
  requestId: string | null
  actionUrl: string | null
  createdAt: string
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/provider/notifications?limit=20', { credentials: 'include' })
      const data = await res.json()
      if (data.notifications) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadNotifications()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/provider/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      })
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      toast.error('خطا در علامت‌گذاری')
    }
  }

  const handleMarkAllAsRead = async () => {
    setLoading(true)
    try {
      await fetch('/api/provider/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'mark-all-read' }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })))
      setUnreadCount(0)
      toast.success('همه‌ی اعلان‌ها خوانده شدند')
    } catch {
      toast.error('خطا')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative"
        aria-label="اعلان‌ها"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
          >
            {unreadCount > 9 ? '۹+' : unreadCount.toLocaleString('fa-IR')}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="border-b px-3 py-2 flex items-center justify-between">
              <div className="font-bold text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                اعلان‌ها
                {unreadCount > 0 && (
                  <Badge variant="default" className="text-[10px] h-4 px-1">
                    {unreadCount.toLocaleString('fa-IR')} جدید
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px]"
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                >
                  <CheckCheck className="w-3 h-3 ml-1" />
                  خواندن همه
                </Button>
              )}
            </div>

            {/* Notifications list */}
            <ScrollArea className="max-h-96">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <div className="text-sm">اعلانی وجود ندارد</div>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => {
                    const style = getNotificationStyle(n.type)
                    return (
                      <div
                        key={n.id}
                        className={`p-3 hover:bg-muted/30 transition-colors cursor-pointer ${!n.read ? style.bgColor : ''}`}
                        onClick={() => !n.read && handleMarkAsRead(n.id)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`shrink-0 mt-0.5 ${style.color}`}>
                            <NotificationIcon type={n.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm ${!n.read ? 'font-bold' : 'font-medium'}`}>
                              {n.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                              {n.message}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {formatRelative(n.createdAt)}
                            </div>
                          </div>
                          {!n.read && (
                            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t p-2 text-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => {
                    setOpen(false)
                    loadNotifications()
                  }}
                >
                  به‌روزرسانی
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotificationIcon({ type }: { type: NotificationType }) {
  const icons: Record<NotificationType, React.ReactNode> = {
    NEW_REQUEST: <Bell className="w-4 h-4" />,
    REQUEST_SELECTED: <Check className="w-4 h-4" />,
    REQUEST_EXPIRED: <Bell className="w-4 h-4" />,
    SERVICE_COMPLETED: <Bell className="w-4 h-4" />,
    WALLET_LOW: <Bell className="w-4 h-4" />,
    WALLET_TOPUP: <Bell className="w-4 h-4" />,
    DOCUMENT_VERIFIED: <Check className="w-4 h-4" />,
    DOCUMENT_REJECTED: <Bell className="w-4 h-4" />,
    NEW_RATING: <Bell className="w-4 h-4" />,
    GENERIC: <Bell className="w-4 h-4" />,
  }
  return icons[type] || <Bell className="w-4 h-4" />
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000 // seconds
  if (diff < 60) return 'همین حالا'
  if (diff < 3600) return `${Math.floor(diff / 60).toLocaleString('fa-IR')} دقیقه پیش`
  if (diff < 86400) return `${Math.floor(diff / 3600).toLocaleString('fa-IR')} ساعت پیش`
  if (diff < 604800) return `${Math.floor(diff / 86400).toLocaleString('fa-IR')} روز پیش`
  return d.toLocaleDateString('fa-IR')
}
