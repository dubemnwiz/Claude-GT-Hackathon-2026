"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"

export function Clock() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    return (
        <div className="font-mono text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
            {format(time, "hh:mm:ss a")}
        </div>
    )
}
