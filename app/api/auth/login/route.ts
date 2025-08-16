import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const agent = await auth.login(email, password)

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
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 401 })
  }
}
