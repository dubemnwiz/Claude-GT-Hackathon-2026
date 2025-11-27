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
        const { weight, date } = body

        const log = await prisma.weightLog.create({
            data: {
                userId: session.user.id,
                weight,
                date: new Date(date),
            },
        })

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
        const logs = await prisma.weightLog.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                date: 'desc',
            },
            take: 30, // Last 30 entries
        })

        return NextResponse.json(logs)
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
        await prisma.weightLog.delete({
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
