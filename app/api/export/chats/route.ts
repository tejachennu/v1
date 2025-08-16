import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    const format = searchParams.get("format") || "json"

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }

    // Get all tickets for the agent
    const sql = `
      SELECT t.*, a.name as agent_name 
      FROM tickets t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      WHERE t.agent_id = ? OR t.agent_id IS NULL
      ORDER BY t.created_at DESC
    `
    const tickets = (await db.query(sql, [agentId])) as any[]

    if (format === "csv") {
      // Generate CSV format
      let csvContent = "Customer ID,Customer Name,Agent Name,Status,Created At,Updated At,Messages Count,Last Message\n"

      tickets.forEach((ticket) => {
        const messages = ticket.messages ? JSON.parse(ticket.messages) : []
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
        const lastMessageText = lastMessage
          ? (lastMessage.text || `Sent ${lastMessage.media?.type || "file"}`).replace(/"/g, '""')
          : ""

        csvContent += `"${ticket.customer_id}","${ticket.customer_name}","${ticket.agent_name || "Unassigned"}","${ticket.status}","${ticket.created_at}","${ticket.updated_at}","${messages.length}","${lastMessageText}"\n`
      })

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="chat-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    } else {
      // Generate JSON format with full conversation details
      const exportData = {
        exportDate: new Date().toISOString(),
        agentId: Number.parseInt(agentId),
        totalConversations: tickets.length,
        conversations: tickets.map((ticket) => ({
          ticketId: ticket.id,
          customerId: ticket.customer_id,
          customerName: ticket.customer_name,
          agentName: ticket.agent_name || "Unassigned",
          status: ticket.status,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
          expiresAt: ticket.expires_at,
          messages: ticket.messages ? JSON.parse(ticket.messages) : [],
        })),
      }

      return NextResponse.json(exportData, {
        headers: {
          "Content-Disposition": `attachment; filename="chat-export-${new Date().toISOString().split("T")[0]}.json"`,
        },
      })
    }
  } catch (error: any) {
    console.error("Export error:", error)
    return NextResponse.json({ error: error.message || "Export failed" }, { status: 500 })
  }
}
