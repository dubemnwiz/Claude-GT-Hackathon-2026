import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const { workout, date, isPR, exercises, duration, notes } = body

        // Build data object — only include duration/notes if they have values,
        // so a DB without the new columns (pre-migration) still saves cleanly.
        const baseData = {
            userId: session.user.id,
            workout,
            date: new Date(date),
            isPR: isPR ?? false,
            exercises: exercises ?? undefined,
        }

        let log
        try {
            log = await prisma.workoutLog.create({
                data: {
                    ...baseData,
                    ...(duration != null && { duration }),
                    ...(notes != null && { notes }),
                },
            })
        } catch (innerError: any) {
            // If new columns don't exist in DB yet (schema migration pending),
            // fall back to saving without them so the workout isn't lost.
            if (String(innerError).includes("duration") || String(innerError).includes("notes") || String(innerError).includes("column")) {
                log = await prisma.workoutLog.create({ data: baseData })
            } else {
                throw innerError
            }
        }

        return NextResponse.json(log)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const logs = await prisma.workoutLog.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                date: 'desc',
            },
            take: 100, // Last 100 entries (needed for ghost mode + day navigation)
        })

        return NextResponse.json(logs)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { id, isPR, exercises, duration, notes } = body

        const updateData: Record<string, unknown> = {}
        if (isPR !== undefined) updateData.isPR = isPR
        if (exercises !== undefined) updateData.exercises = exercises
        if (duration !== undefined) updateData.duration = duration
        if (notes !== undefined) updateData.notes = notes

        const log = await prisma.workoutLog.update({
            where: { id, userId: session.user.id },
            data: updateData,
        })
        return NextResponse.json(log)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return new NextResponse("ID required", { status: 400 })

    try {
        await prisma.workoutLog.delete({
            where: {
                id,
                userId: session.user.id,
            },
        })
        return new NextResponse("Deleted", { status: 200 })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
