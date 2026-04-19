"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, LogOut, Plus, Radio, MapPin } from "lucide-react"
import { signOut } from "next-auth/react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { MobileActionDrawer } from "@/components/ui/MobileActionDrawer"

const routes = [
    { label: "Home", href: "/", icon: Home },
    { label: "Field Coach", href: "/correspondent", icon: Radio },
    { label: "NutriMap", href: "/nutrimap", icon: MapPin },
]

function DockItem({
    href,
    label,
    icon: Icon,
    active,
    mouseX,
}: {
    href: string
    label: string
    icon: React.ElementType
    active: boolean
    mouseX: ReturnType<typeof useMotionValue<number>>
}) {
    const ref = useRef<HTMLAnchorElement>(null)

    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect()
        if (!bounds) return 999
        return val - (bounds.left + bounds.width / 2)
    })

    const scale = useSpring(
        useTransform(distance, [-120, 0, 120], [1, 1.55, 1]),
        { stiffness: 300, damping: 25 }
    )

    // Disable scaling on mobile
    const resolvedScale = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : scale

    return (
        <Link ref={ref} href={href}>
            <motion.div
                style={{ scale: resolvedScale }}
                className={cn(
                    "relative flex flex-col items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-2xl transition-colors duration-200 cursor-pointer group",
                    active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
            >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />

                {/* Tooltip */}
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium bg-popover text-popover-foreground border border-border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                    {label}
                </span>

                {/* Active dot */}
                {active && (
                    <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary-foreground/60" />
                )}
            </motion.div>
        </Link>
    )
}

export function Navbar() {
    const pathname = usePathname()
    const mouseX = useMotionValue(Infinity)
    const [isActionOpen, setIsActionOpen] = useState(false)

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="fixed left-1/2 -translate-x-1/2 z-50"
            style={{ bottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}
        >
            <motion.div
                onMouseMove={(e) => mouseX.set(e.clientX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                className={cn(
                    "flex items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-2 sm:py-3 rounded-3xl",
                    "border border-border",
                    "bg-card/95 backdrop-blur-md",
                    "shadow-lg shadow-black/5"
                )}
            >
                {routes.slice(0, 2).map((route) => (
                    <DockItem
                        key={route.href}
                        href={route.href}
                        label={route.label}
                        icon={route.icon}
                        active={pathname === route.href}
                        mouseX={mouseX}
                    />
                ))}

                {/* Central Action Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsActionOpen(true)}
                    className={cn(
                        "flex items-center justify-center mx-1 w-11 h-11 sm:w-14 sm:h-14 rounded-2xl",
                        "bg-primary text-primary-foreground",
                        "transition-all duration-200"
                    )}
                >
                    <Plus className="h-6 w-6 sm:h-7 sm:w-7" />
                </motion.button>

                {routes.slice(2).map((route) => (
                    <DockItem
                        key={route.href}
                        href={route.href}
                        label={route.label}
                        icon={route.icon}
                        active={pathname === route.href}
                        mouseX={mouseX}
                    />
                ))}

                {/* Divider + Theme + Logout — desktop only; on mobile these live in the drawer */}
                <div className="hidden sm:flex items-center gap-0.5">
                    <div className="w-px h-8 bg-border/60 mx-1" />
                    <div className="px-1">
                        <ThemeSwitcher />
                    </div>
                    <div className="w-px h-8 bg-border/60 mx-1" />
                    <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                        title="Logout"
                    >
                        <LogOut className="h-4.5 w-4.5" />
                    </motion.button>
                </div>
            </motion.div>

            {/* Mobile Quick Actions Drawer */}
            <MobileActionDrawer
                isOpen={isActionOpen}
                onClose={() => setIsActionOpen(false)}
            />
        </motion.div>
    )
}
