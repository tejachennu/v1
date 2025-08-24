import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../lib/database" // Assuming this connects to your MySQL pool

// GET all support tickets
export async function GET() {
  try {
    const sql = `
      SELECT id, name, email, phone, description, status, assigned_agent AS assignedAgent, created_at AS createdAt, updated_at AS updatedAt
      FROM support_tickets
      ORDER BY created_at DESC
    `;
    const tickets = await db.query(sql);

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch tickets" }, { status: 500 });
  }
}

// POST a new support ticket
export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, description } = await request.json();

    if (!name || !email || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const createdAt = new Date();
    const updatedAt = new Date();
    const status = "open";

    const sql = `
      INSERT INTO support_tickets (name, email, phone, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [name, email, phone ?? null, description, status, createdAt, updatedAt];

    const result: any = await db.query(sql, params);

    return NextResponse.json({
      success: true,
      ticket: {
        id: result.insertId,
        name,
        email,
        phone,
        description,
        status,
        createdAt,
        updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ success: false, error: "Failed to create ticket" }, { status: 500 });
  }
}

// In-memory ticket storage for PATCH example (replace with DB in production)

export async function PATCH(request: NextRequest) {
  try {
    const { ticketId, status, assignedAgent } = await request.json()

    if (!ticketId) {
      return NextResponse.json({ success: false, error: "Ticket ID is required" }, { status: 400 })
    }

    // Prepare dynamic fields to update
    const updates: string[] = []
    const params: any[] = []

    if (status) {
      updates.push("status = ?")
      params.push(status)
    }

    if (assignedAgent) {
      updates.push("assigned_agent = ?")
      params.push(assignedAgent)
    }

    // Always update the timestamp
    updates.push("updated_at = ?")
    params.push(new Date())

    params.push(ticketId)

    const sql = `
      UPDATE support_tickets
      SET ${updates.join(", ")}
      WHERE id = ?
    `

    const result: any = await db.query(sql, params)

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 })
    }

    // Fetch the updated ticket
    const [updatedTicket]: any = await db.query(
      `SELECT id, name, email, phone, description, status, assigned_agent AS assignedAgent, created_at AS createdAt, updated_at AS updatedAt
       FROM support_tickets
       WHERE id = ?`,
      [ticketId]
    )

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    })
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json({ success: false, error: "Failed to update ticket" }, { status: 500 })
  }
}
