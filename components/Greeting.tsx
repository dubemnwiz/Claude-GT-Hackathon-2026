"use client"

import { useState, useEffect } from "react"

export function Greeting({ name }: { name?: string | null }) {
    const [greeting, setGreeting] = useState("")

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting("Good Morning")
        else if (hour < 18) setGreeting("Good Afternoon")
        else setGreeting("Good Evening")
    }, [])

    return (
        <h1 className="text-2xl md:text-4xl font-light text-muted-foreground">
            {greeting}, <span className="text-foreground font-medium">{name || "User"}</span>
        </h1>
    )
}
