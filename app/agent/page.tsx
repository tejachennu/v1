"use client"
import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { LoginForm } from "@/components/auth/LoginForm"
import { AgentDashboard } from "@/components/agent/AgentDashboard"

export default function AgentPage() {
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user?.role === "customer") {
      window.location.href = "/customer"
    }
  }, [isAuthenticated, user])

  if (!isAuthenticated) {
    return <LoginForm />
  }

  if (user?.role !== "agent") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-muted-foreground">You need agent privileges to access this page.</p>
        </div>
      </div>
    )
  }

  return <AgentDashboard />
}
