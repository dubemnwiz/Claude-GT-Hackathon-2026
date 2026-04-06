import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { google } from "googleapis"
import { getGoogleOAuthClient } from "@/lib/google"
import { addDays, parseISO, getDay, format } from "date-fns"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const weekOf = searchParams.get("weekOf") // YYYY-MM-DD (Monday)
    if (!weekOf) {
        return NextResponse.json({ error: "weekOf required" }, { status: 400 })
    }

    const auth = await getGoogleOAuthClient(session.user.id)
    if (!auth) {
        return NextResponse.json({ connected: false, events: [] })
    }

    try {
        const monday = parseISO(weekOf)
        const sunday = addDays(monday, 6)

        // Build ISO strings spanning the full week in local midnight terms
        const timeMin = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0).toISOString()
        const timeMax = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59).toISOString()

        const calendar = google.calendar({ version: "v3", auth })
        const response = await calendar.events.list({
            calendarId: "primary",
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 100,
        })

        const events = (response.data.items ?? [])
            .filter(e => e.status !== "cancelled" && (e.summary || e.description))
            .map(event => {
                const startRaw = event.start?.dateTime ?? event.start?.date ?? null
                const isAllDay = !event.start?.dateTime

                let day = "Monday"
                if (startRaw) {
                    // All-day events have date strings like "2024-01-15"; timed events have full ISO
                    const parsed = isAllDay
                        ? parseISO(startRaw)
                        : new Date(startRaw)
                    day = DAY_NAMES[getDay(parsed)]
                }

                return {
                    id: event.id!,
                    title: event.summary ?? "(No title)",
                    day,
                    start: startRaw,
                    end: event.end?.dateTime ?? event.end?.date ?? null,
                    isAllDay,
                    timeLabel: !isAllDay && startRaw
                        ? format(new Date(startRaw), "h:mm a")
                        : null,
                }
            })

        return NextResponse.json({ connected: true, events })
    } catch (error) {
        console.error("GCal events fetch error:", error)
        return NextResponse.json({ connected: true, events: [], error: "Failed to fetch" })
    }
}
