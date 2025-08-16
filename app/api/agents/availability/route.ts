import { type NextRequest, NextResponse } from "next/server"

// In-memory store for agent status (in production, use Redis or database)
const agentStatus = new Map<
  string,
  {
    id: string
    name: string
    status: "online" | "offline" | "busy"
    lastSeen: string
  }
>()

export async function GET() {
  try {
    const agents = Array.from(agentStatus.values())
    const availableAgents = agents.filter((agent) => agent.status === "online")

    return NextResponse.json({
      success: true,
      agents,
      available: availableAgents.length > 0,
      count: availableAgents.length,
    })
  } catch (error) {
    console.error("Error fetching agent availability:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch agent availability" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agentId, name, status } = await request.json()

    if (!agentId || !name || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const agent = {
      id: agentId,
      name,
      status: status as "online" | "offline" | "busy",
      lastSeen: new Date().toISOString(),
    }

    agentStatus.set(agentId, agent)

    // Clean up offline agents older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    for (const [id, agentData] of agentStatus.entries()) {
      if (agentData.status === "offline" && agentData.lastSeen < fiveMinutesAgo) {
        agentStatus.delete(id)
      }
    }

    const agents = Array.from(agentStatus.values())
    const availableAgents = agents.filter((agent) => agent.status === "online")

    return NextResponse.json({
      success: true,
      agent,
      agents,
      available: availableAgents.length > 0,
      count: availableAgents.length,
    })
  } catch (error) {
    console.error("Error updating agent status:", error)
    return NextResponse.json({ success: false, error: "Failed to update agent status" }, { status: 500 })
  }
}
