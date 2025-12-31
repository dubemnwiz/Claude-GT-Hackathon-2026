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
        const { date, content, rating } = body

        // Parse date string to Date object (start of day)
        const entryDate = new Date(date)

        const entry = await prisma.diaryEntry.upsert({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date: entryDate,
                },
            },
            update: {
                content,
                rating,
            },
            create: {
                userId: session.user.id,
                date: entryDate,
                content,
                rating,
            },
        })

        return NextResponse.json(entry)
    } catch (error) {
        console.log("[DIARY_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateString = searchParams.get("date")

    try {
        if (!dateString) {
            // Return list of dates that have entries (non-empty)
            const entries = await prisma.diaryEntry.findMany({
                where: {
                    userId: session.user.id,
                    content: {
                        not: ""
                    }
                },
                select: { date: true, rating: true }
            })
            // Return objects with date and rating
            return NextResponse.json(entries.map(e => ({
                date: e.date.toISOString().split('T')[0],
                rating: e.rating
            })))
        }

        const entryDate = new Date(dateString)
        const entry = await prisma.diaryEntry.findUnique({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date: entryDate,
                }
            }
        })

        return NextResponse.json(entry || { content: "" })
    } catch (error) {
        console.log("[DIARY_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
