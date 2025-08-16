import bcrypt from "bcryptjs"
import { db } from "./database"

export interface Agent {
  id: number
  email: string
  name: string
  status: "online" | "offline"
}

export const auth = {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12)
  },

  // Verify password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword)
  },

  // Register new agent
  async register(email: string, password: string, name: string): Promise<Agent> {
    // Check if agent already exists
    const existingAgent = await db.getAgentByEmail(email)
    if (existingAgent) {
      throw new Error("Agent already exists with this email")
    }

    // Hash password and create agent
    const hashedPassword = await this.hashPassword(password)
    const agentId = await db.createAgent(email, hashedPassword, name)

    return {
      id: agentId,
      email,
      name,
      status: "offline",
    }
  },

  // Login agent
  async login(email: string, password: string): Promise<Agent> {
    const agent = await db.getAgentByEmail(email)
    if (!agent) {
      throw new Error("Invalid email or password")
    }

    const isValidPassword = await this.verifyPassword(password, agent.password)
    if (!isValidPassword) {
      throw new Error("Invalid email or password")
    }

    // Update status to online
    await db.updateAgentStatus(agent.id, "online")

    return {
      id: agent.id,
      email: agent.email,
      name: agent.name,
      status: "online",
    }
  },

  // Logout agent
  async logout(agentId: number): Promise<void> {
    await db.updateAgentStatus(agentId, "offline")
  },
}
