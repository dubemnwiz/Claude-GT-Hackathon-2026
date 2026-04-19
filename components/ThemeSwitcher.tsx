"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export function ThemeSwitcher() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Combine mount detection + auto-switch in a single effect to satisfy the linter.
    // Calling setTheme from next-themes is an external system call, not internal React state.
    useEffect(() => {
        setMounted(true)

        // Auto-switch only when the user hasn't chosen a preference yet
        if (theme === "system") {
            const hour = new Date().getHours()
            const prefersDark = hour >= 17 || hour < 6
            setTheme(prefersDark ? "dark" : "light")
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (!mounted) return null

    const isDark = resolvedTheme === "dark"

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative flex items-center justify-between w-10 h-6 sm:w-14 sm:h-7 rounded-full px-1 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-muted"
            aria-label="Toggle theme"
        >
            <Sun className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Moon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

            {/* Sliding knob */}
            <span
                className="absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-200 bg-primary"
                style={{
                    left: isDark ? "calc(100% - 1.25rem)" : "0.25rem",
                }}
            />
        </button>
    )
}
