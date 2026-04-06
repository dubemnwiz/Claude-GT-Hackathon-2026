import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { google } from "googleapis"
import { prisma } from "@/lib/prisma"
import { getGoogleOAuthClient } from "@/lib/google"
import { addDays, startOfWeek } from "date-fns"

const DAYS_MAP: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
    Friday: 4, Saturday: 5, Sunday: 6,
}

function taskDateString(day: string, weekOf?: string | null): string {
    let monday: Date
    if (weekOf) {
        monday = new Date(weekOf + "T00:00:00")
    } else {
        monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    }
    const offset = DAYS_MAP[day] ?? 0
    const date = addDays(monday, offset)
    return date.toISOString().split("T")[0] // YYYY-MM-DD
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const auth = await getGoogleOAuthClient(session.user.id)
    if (!auth) {
        // User hasn't connected Google — silently no-op
        return NextResponse.json({ skipped: true })
    }

    try {
        const { taskId, day, content, weekOf } = await req.json()

        // Look up existing task to check for a prior GCal event
        const task = await prisma.task.findUnique({
            where: { id: taskId, userId: session.user.id },
            select: { gcalEventId: true },
        })

        const dateString = taskDateString(day, weekOf)
        const calendar = google.calendar({ version: "v3", auth })

        const eventBody = {
            summary: content,
            description: `Synced from Meridian · Task ID: ${taskId}`,
            start: { date: dateString },
            end:   { date: dateString },
        }

        let eventId: string | null | undefined = task?.gcalEventId

        if (eventId) {
            // Update existing event
            try {
                await calendar.events.update({
                    calendarId: "primary",
                    eventId,
                    requestBody: eventBody,
                })
            } catch {
                // Event was deleted from GCal — create a fresh one
                eventId = null
            }
        }

        if (!eventId) {
            // Create new event
            const res = await calendar.events.insert({
                calendarId: "primary",
                requestBody: eventBody,
            })
            eventId = res.data.id

            // Persist the event ID back to the task
            if (eventId) {
                await prisma.task.update({
                    where: { id: taskId },
                    data: { gcalEventId: eventId },
                })
            }
        }

        return NextResponse.json({ success: true, eventId, syncedDate: dateString })
    } catch (error) {
        console.error("Calendar sync error:", error)
        return NextResponse.json({ error: "Sync failed" }, { status: 500 })
    }
}
