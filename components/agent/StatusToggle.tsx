"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { Power, PowerOff } from "lucide-react"

export const StatusToggle: React.FC = () => {
  const { user, updateStatus } = useAuth()

  if (!user || user.role !== "agent") return null

  const isOnline = user.status === "online"

  const handleToggleStatus = async () => {
    const newStatus = isOnline ? "offline" : "online"
    await updateStatus(newStatus)
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant={isOnline ? "default" : "secondary"} className="capitalize">
        {isOnline ? "Online" : "Offline"}
      </Badge>
      <Button
        onClick={handleToggleStatus}
        variant={isOnline ? "destructive" : "default"}
        size="sm"
        className="flex items-center gap-2"
      >
        {isOnline ? (
          <>
            <PowerOff className="w-4 h-4" />
            Go Offline
          </>
        ) : (
          <>
            <Power className="w-4 h-4" />
            Go Online
          </>
        )}
      </Button>
    </div>
  )
}
