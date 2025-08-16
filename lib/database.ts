import mysql from "mysql2/promise"

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "194.163.45.105",
  user: process.env.DB_USER || "marketingOwner",
  password: process.env.DB_PASSWORD || "M@rketing123!",
  database: process.env.DB_NAME || "MarketingDb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

// Create connection pool
const pool = mysql.createPool(dbConfig)

// Database utility functions
export const db = {
  // Execute query with parameters
  async query(sql: string, params?: any[]) {
    try {
      const [results] = await pool.execute(sql, params)
      return results
    } catch (error) {
      console.error("Database query error:", error)
      throw error
    }
  },

  // Get agent by email
  async getAgentByEmail(email: string) {
    const sql = "SELECT * FROM agents WHERE email = ?"
    const results = (await this.query(sql, [email])) as any[]
    return results[0] || null
  },

  // Create new agent
  async createAgent(email: string, password: string, name: string) {
    const sql = "INSERT INTO agents (email, password, name) VALUES (?, ?, ?)"
    const result = (await this.query(sql, [email, password, name])) as any
    return result.insertId
  },

  // Update agent status
  async updateAgentStatus(agentId: number, status: "online" | "offline") {
    const sql = "UPDATE agents SET status = ? WHERE id = ?"
    await this.query(sql, [status, agentId])
  },

  // Get online agents count
  async getOnlineAgentsCount() {
    const sql = 'SELECT COUNT(*) as count FROM agents WHERE status = "online"'
    const results = (await this.query(sql)) as any[]
    return results[0].count
  },

  // Create or update ticket
  async upsertTicket(customerId: string, customerName: string, messages: any[]) {
    const sql = `
      INSERT INTO tickets (customer_id, customer_name, messages, expires_at) 
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
      ON DUPLICATE KEY UPDATE 
      messages = ?, 
      updated_at = CURRENT_TIMESTAMP,
      expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
    `
    const messagesJson = JSON.stringify(messages)
    await this.query(sql, [customerId, customerName, messagesJson, messagesJson])
  },

  // Get ticket by customer ID
  async getTicketByCustomerId(customerId: string) {
    const sql = "SELECT * FROM tickets WHERE customer_id = ? AND expires_at > NOW()"
    const results = (await this.query(sql, [customerId])) as any[]
    return results[0] || null
  },

  // Clean expired tickets (run daily at 6 AM)
  async cleanExpiredTickets() {
    const sql = "DELETE FROM tickets WHERE expires_at <= NOW()"
    const result = (await this.query(sql)) as any
    return result.affectedRows
  },

  // Get all tickets for export
  async getAllTicketsForAgent(agentId: number) {
    const sql = `
      SELECT t.*, a.name as agent_name 
      FROM tickets t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      WHERE t.agent_id = ? OR t.agent_id IS NULL
      ORDER BY t.created_at DESC
    `
    return (await this.query(sql, [agentId])) as any[]
  },
}

export const query = db.query.bind(db)

export default db
