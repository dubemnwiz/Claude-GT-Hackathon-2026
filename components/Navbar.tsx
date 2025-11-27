"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Book, Dumbbell, Calendar, StickyNote, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import { motion } from "framer-motion"

const routes = [
    {
        label: "Home",
        href: "/",
    },
    {
        label: "Diary",
        href: "/diary",
    },
    {
        label: "Fitness",
        href: "/fitness",
    },
    {
        label: "Mind Dump",
        href: "/dashboard",
    },
    {
        label: "Planning",
        href: "/planning",
    },
]

export function Navbar() {
    const pathname = usePathname()

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl flex items-center justify-between px-6"
        >
            <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center">
                        <span className="font-bold text-white text-sm">OS</span>
                    </div>
                </Link>

                <div className="hidden md:flex items-center gap-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 relative group",
                                pathname === route.href ? "text-white" : "text-zinc-400 hover:text-white"
                            )}
                        >
                            {route.label}
                            {pathname === route.href && (
                                <motion.div
                                    layoutId="navbar-indicator"
                                    className="absolute inset-0 bg-white/10 rounded-full -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </Link>
                    ))}
                </div>
            </div>

            <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-red-400"
                title="Logout"
            >
                <LogOut className="h-5 w-5" />
            </button>
        </motion.nav>
    )
}
