"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Mail, User, Phone, MessageSquare, Ticket } from "lucide-react"

interface ContactFormProps {
  onStartChat: (contactInfo: {
    name: string
    email: string
    phone?: string
  }) => void
  onCreateTicket: (ticketInfo: {
    name: string
    email: string
    phone?: string
    description: string
  }) => void
  agentsOnline: boolean
}

export function ContactForm({ onStartChat, onCreateTicket, agentsOnline }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
  })
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (showTicketForm && !formData.description.trim()) {
      newErrors.description = "Issue description is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onStartChat({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
      })
    }
  }

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onCreateTicket({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        description: formData.description,
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-card p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-border bg-card/95 backdrop-blur-md">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              {showTicketForm ? "Create Support Ticket" : "Start Conversation"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {agentsOnline
                ? "Our agents are online and ready to help!"
                : "No agents are currently online. Create a ticket and we'll get back to you."}
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {!agentsOnline && !showTicketForm && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-center">
                <Ticket className="w-6 h-6 text-accent mx-auto mb-2" />
                <p className="text-sm text-accent-foreground/80">
                  All agents are currently offline. Would you like to create a support ticket instead?
                </p>
                <Button
                  onClick={() => setShowTicketForm(true)}
                  className="mt-3 bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="sm"
                >
                  Create Ticket
                </Button>
              </div>
            )}

            <form onSubmit={showTicketForm ? handleCreateTicket : handleStartChat} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`h-11 bg-input border-border focus:ring-2 focus:ring-ring ${
                    errors.name ? "border-destructive" : ""
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`h-11 bg-input border-border focus:ring-2 focus:ring-ring ${
                    errors.email ? "border-destructive" : ""
                  }`}
                  placeholder="Enter your email address"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number (Optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="h-11 bg-input border-border focus:ring-2 focus:ring-ring"
                  placeholder="Enter your phone number"
                />
              </div>

              {showTicketForm && (
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Issue Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className={`min-h-[100px] bg-input border-border focus:ring-2 focus:ring-ring resize-none ${
                      errors.description ? "border-destructive" : ""
                    }`}
                    placeholder="Please describe your issue or question in detail..."
                  />
                  {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {showTicketForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTicketForm(false)}
                    className="flex-1 h-11 border-border hover:bg-muted"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {showTicketForm ? "Create Ticket" : "Start Chat"}
                </Button>
              </div>
            </form>

            {agentsOnline && !showTicketForm && (
              <div className="text-center pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Prefer to create a ticket instead?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTicketForm(true)}
                  className="text-accent hover:text-accent hover:bg-accent/10"
                >
                  Create Support Ticket
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
