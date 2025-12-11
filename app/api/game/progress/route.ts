import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        let progress = await prisma.stickCricketProgress.findUnique({
            where: { userId: session.user.id }
        })

        if (!progress) {
            progress = await prisma.stickCricketProgress.create({
                data: {
                    userId: session.user.id,
                    level: 1,
                    highScore: 0
                }
            })
        }

        return NextResponse.json(progress)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { level, score } = body

        const currentProgress = await prisma.stickCricketProgress.findUnique({
            where: { userId: session.user.id }
        })

        if (!currentProgress) {
            const newProgress = await prisma.stickCricketProgress.create({
                data: {
                    userId: session.user.id,
                    level: level || 1,
                    highScore: score || 0
                }
            })
            return NextResponse.json(newProgress)
        }

        const data: any = {}
        if (level && level > currentProgress.level) {
            data.level = level
        }
        if (score && score > currentProgress.highScore) {
            data.highScore = score
        }

        if (Object.keys(data).length > 0) {
            const updated = await prisma.stickCricketProgress.update({
                where: { userId: session.user.id },
                data
            })
            return NextResponse.json(updated)
        }

        return NextResponse.json(currentProgress)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
