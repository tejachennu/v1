import { type NextRequest, NextResponse } from "next/server"

// In-memory store for tickets (in production, use a database)
const tickets = new Map<
  string,
  {
    id: string
    name: string
    email: string
    phone?: string
    description: string
    status: "open" | "closed" | "in-progress"
    createdAt: string
    updatedAt: string
    assignedAgent?: string
  }
>()

export async function GET() {
  try {
    const allTickets = Array.from(tickets.values())
    return NextResponse.json({
      success: true,
      tickets: allTickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    })
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tickets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, description } = await request.json()

    if (!name || !email || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const ticket = {
      id: ticketId,
      name,
      email,
      phone,
      description,
      status: "open" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    tickets.set(ticketId, ticket)

    return NextResponse.json({
      success: true,
      ticket,
    })
  } catch (error) {
    console.error("Error creating ticket:", error)
    return NextResponse.json({ success: false, error: "Failed to create ticket" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { ticketId, status, assignedAgent } = await request.json()

    if (!ticketId) {
      return NextResponse.json({ success: false, error: "Ticket ID is required" }, { status: 400 })
    }

    const ticket = tickets.get(ticketId)
    if (!ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 })
    }

    const updatedTicket = {
      ...ticket,
      ...(status && { status }),
      ...(assignedAgent && { assignedAgent }),
      updatedAt: new Date().toISOString(),
    }

    tickets.set(ticketId, updatedTicket)

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    })
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json({ success: false, error: "Failed to update ticket" }, { status: 500 })
  }
}
