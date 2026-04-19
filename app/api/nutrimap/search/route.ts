import { NextResponse } from "next/server"

const NUTRIMAP_URL = process.env.NEXT_PUBLIC_NUTRIMAP_URL ?? "http://localhost:8000"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await fetch(`${NUTRIMAP_URL}/api/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "NutriMap backend unreachable. Is it running on port 8000?" },
      { status: 503 },
    )
  }
}
