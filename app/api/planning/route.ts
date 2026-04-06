import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { google } from "googleapis"
import { getGoogleOAuthClient } from "@/lib/google"

function getMondayKey(date: Date): string {
    const dayOfWeek = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const y = monday.getFullYear()
    const m = String(monday.getMonth() + 1).padStart(2, '0')
    const d = String(monday.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const weekOf = searchParams.get("weekOf")
    const currentWeekKey = getMondayKey(new Date())

    try {
        const tasks = await prisma.task.findMany({
            where: {
                userId: session.user.id,
                ...(weekOf ? {
                    OR: [
                        { weekOf },
                        // Include legacy tasks (no weekOf) only when fetching the current week
                        ...(weekOf === currentWeekKey ? [{ weekOf: null }] : [])
                    ]
                } : {})
            },
            orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(tasks)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { content, status, day, notes, priority, weekOf } = body

        const task = await prisma.task.create({
            data: {
                content,
                status: status || "NOT_STARTED",
                day: day || "Monday",
                priority: priority || "MEDIUM",
                weekOf: weekOf || null,
                notes: notes || "",
                userId: session.user.id,
            },
        })
        return NextResponse.json(task)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { id, status, day, notes, priority, weekOf } = body

        const task = await prisma.task.update({
            where: { id, userId: session.user.id },
            data: {
                ...(status && { status }),
                ...(day && { day }),
                ...(notes !== undefined && { notes }),
                ...(priority && { priority }),
                ...(weekOf !== undefined && { weekOf })
            },
        })
        return NextResponse.json(task)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const all = searchParams.get("all")
    const weekOf = searchParams.get("weekOf")
    const currentWeekKey = getMondayKey(new Date())

    try {
        if (all === "true") {
            await prisma.task.deleteMany({
                where: {
                    userId: session.user.id,
                    ...(weekOf ? {
                        OR: [
                            { weekOf },
                            ...(weekOf === currentWeekKey ? [{ weekOf: null }] : [])
                        ]
                    } : {})
                },
            })
        } else if (id) {
            // Delete the linked GCal event first (if any)
            const task = await prisma.task.findUnique({
                where: { id, userId: session.user.id },
                select: { gcalEventId: true },
            })
            if (task?.gcalEventId) {
                const auth = await getGoogleOAuthClient(session.user.id)
                if (auth) {
                    const calendar = google.calendar({ version: "v3", auth })
                    await calendar.events.delete({
                        calendarId: "primary",
                        eventId: task.gcalEventId,
                    }).catch(() => { /* event may already be gone */ })
                }
            }
            await prisma.task.delete({
                where: { id, userId: session.user.id },
            })
        } else {
            return new NextResponse("ID or all flag required", { status: 400 })
        }
        return new NextResponse("Deleted", { status: 200 })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
