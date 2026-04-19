"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Utensils, ChevronRight, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"

interface MobileActionDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileActionDrawer({ isOpen, onClose }: MobileActionDrawerProps) {
  const router = useRouter()

  const actions = [
    {
      id: "food",
      label: "Log Food",
      description: "Tell the coach what you ate",
      icon: Utensils,
      color: "text-foreground",
      bg: "bg-muted",
      href: "/correspondent"
    }
  ]

  const handleAction = (href: string) => {
    onClose()
    router.push(href)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-card border-t border-border rounded-t-[2rem] shadow-xl"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}
          >
            <div className="p-6 space-y-5">
              {/* Grab Handle */}
              <div className="w-12 h-1 bg-muted rounded-full mx-auto" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Quick Actions</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.href)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-muted border border-border transition-all group"
                  >
                    <div className={cn("p-3 rounded-xl transition-colors", action.bg)}>
                      <action.icon className={cn("w-5 h-5", action.color)} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground text-sm">{action.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{action.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>

              {/* Settings row — theme + logout */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Theme</span>
                  <ThemeSwitcher />
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
