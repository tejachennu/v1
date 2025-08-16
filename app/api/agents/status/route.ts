import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { agentId, status } = await request.json()

    if (!agentId || !status) {
      return NextResponse.json({ error: "Agent ID and status are required" }, { status: 400 })
    }

    await db.updateAgentStatus(agentId, status)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Status update failed" }, { status: 400 })
  }
}

export async function GET() {
  try {
    const count = await db.getOnlineAgentsCount()

    return NextResponse.json({
      success: true,
      onlineAgents: count,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to get agent count" }, { status: 500 })
  }
}
