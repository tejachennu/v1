import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 })
    }

    const agent = await auth.register(email, password, name)

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        status: agent.status,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 400 })
  }
}
