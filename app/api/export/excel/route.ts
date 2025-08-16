import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { conversations, agentId, agentName } = await request.json()

    if (!conversations || !Array.isArray(conversations)) {
      return NextResponse.json({ error: "Invalid conversations data" }, { status: 400 })
    }

    // Create Excel-compatible CSV format
    const headers = [
      "Date",
      "Time",
      "Customer ID",
      "Customer Name",
      "Message Type",
      "Message Content",
      "Agent Name",
      "Session Duration (minutes)",
      "Total Messages",
    ]

    const rows: string[][] = []

    conversations.forEach((conv: any) => {
      const sessionStart = new Date(conv.createdAt)
      const sessionEnd = new Date(conv.lastActivity)
      const sessionDuration = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60))

      conv.messages.forEach((msg: any, index: number) => {
        const msgDate = new Date(msg.timestamp)
        rows.push([
          msgDate.toLocaleDateString(),
          msgDate.toLocaleTimeString(),
          conv.customerId,
          conv.customerName,
          msg.type === "customer" ? "Customer" : "Agent",
          msg.text || (msg.media ? `[${msg.media.type} file: ${msg.media.name}]` : ""),
          msg.agentName || agentName || "",
          index === 0 ? sessionDuration.toString() : "", // Only show duration on first message
          index === 0 ? conv.messages.length.toString() : "", // Only show total on first message
        ])
      })

      // Add separator row between conversations
      if (conversations.indexOf(conv) < conversations.length - 1) {
        rows.push(["", "", "", "", "", "", "", "", ""])
      }
    })

    // Convert to CSV format with proper escaping
    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n")

    // Add BOM for proper Excel UTF-8 handling
    const bom = "\uFEFF"
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="chat-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Excel export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
