"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { LoginForm } from "@/components/auth/LoginForm"

export default function Home() {
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "agent") {
        window.location.href = "/agent"
      } else if (user.role === "customer") {
        window.location.href = "/customer"
      }
    }
  }, [isAuthenticated, user])

  if (!isAuthenticated) {
    return <LoginForm role="agent" />
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
