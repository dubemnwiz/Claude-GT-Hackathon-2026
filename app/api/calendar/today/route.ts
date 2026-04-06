import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { google } from "googleapis"
import { getGoogleOAuthClient } from "@/lib/google"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ events: [] })
    }

    const auth = await getGoogleOAuthClient(session.user.id)
    if (!auth) {
        return NextResponse.json({ events: [], connected: false })
    }

    try {
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
        const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

        const calendar = google.calendar({ version: "v3", auth })
        const response = await calendar.events.list({
            calendarId: "primary",
            timeMin: startOfDay,
            timeMax: endOfDay,
            singleEvents: true,
            orderBy: "startTime",
        })

        const events = (response.data.items ?? [])
            .filter(e => e.status !== "cancelled")
            .map(event => ({
                id:       event.id,
                summary:  event.summary,
                start:    event.start?.dateTime ?? event.start?.date,
                end:      event.end?.dateTime ?? event.end?.date,
                isAllDay: !event.start?.dateTime,
            }))

        return NextResponse.json({ events, connected: true })
    } catch (error) {
        console.error("Google Calendar API Error:", error)
        return NextResponse.json({ events: [], connected: true, error: "Failed to fetch events" })
    }
}
