"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Ticket,
  Clock,
  User,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Calendar,
  AlertCircle,
} from "lucide-react"

interface TicketData {
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

interface TicketManagementProps {
  agentId?: string
  agentName?: string
}

export function TicketManagement({ agentId, agentName }: TicketManagementProps) {
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    filterTickets()
  }, [tickets, searchTerm, statusFilter])

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/tickets")
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterTickets = () => {
    let filtered = tickets
    if (searchTerm) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter)
    }
    setFilteredTickets(filtered)
  }

  const updateTicketStatus = async (ticketId: string, status: "open" | "closed" | "in-progress") => {
    try {
      const response = await fetch("/api/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status,
          assignedAgent: status === "in-progress" ? agentName : undefined,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? data.ticket : ticket)))
        if (selectedTicket?.id === ticketId) setSelectedTicket(data.ticket)
      }
    } catch (error) {
      console.error("Error updating ticket:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-100 text-red-800 border-red-200"
      case "in-progress": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "closed": return "bg-green-100 text-green-800 border-green-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="w-3 h-3" />
      case "in-progress": return <Clock className="w-3 h-3" />
      case "closed": return <CheckCircle className="w-3 h-3" />
      default: return <Ticket className="w-3 h-3" />
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    })

  const openTicketDialog = (ticket: TicketData) => {
    setSelectedTicket(ticket)
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <Card className="h-[600px] flex flex-col">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading tickets...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-[600px] flex flex-col shadow-2xl border border-border bg-card/95 backdrop-blur-md">
      <CardHeader className="pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Ticket className="w-5 h-5" /> Support Tickets
            </CardTitle>
            <p className="text-sm text-muted-foreground">Manage customer support requests</p>
          </div>
          <Badge variant="outline" className="text-xs border-border">
            {filteredTickets.length} tickets
          </Badge>
        </div>

        <div className="flex gap-3 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-input border-border">
              <Filter className="w-4 h-4 mr-2" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      {/* SCROLL AREA for ticket list (main fix is here) */}
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Ticket className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" ? "No tickets match your filters" : "No support tickets yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Customer tickets will appear here"}
              </p>
            </div>
          ) : (
            filteredTickets
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer mb-3"
                  onClick={() => openTicketDialog(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-xs px-2 py-1 ${getStatusColor(ticket.status)}`}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1 capitalize">{ticket.status.replace("-", " ")}</span>
                        </Badge>
                        {ticket.assignedAgent && (
                          <Badge variant="outline" className="text-xs">
                            Assigned to {ticket.assignedAgent}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{ticket.name}</span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{ticket.email}</span>
                        {ticket.phone && (
                          <>
                            <Phone className="w-4 h-4 text-muted-foreground ml-2" />
                            <span className="text-sm text-muted-foreground">{ticket.phone}</span>
                          </>
                        )}
                      </div>

                      <p className="text-sm text-foreground line-clamp-2 mb-2">{ticket.description}</p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created {formatDate(ticket.createdAt)}
                        </div>
                        {ticket.updatedAt !== ticket.createdAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Updated {formatDate(ticket.updatedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" /> Ticket Details
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Badge className={`px-3 py-1 ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusIcon(selectedTicket.status)}
                    <span className="ml-1 capitalize">{selectedTicket.status.replace("-", " ")}</span>
                  </Badge>
                  {selectedTicket.assignedAgent && (
                    <Badge variant="outline">Assigned to {selectedTicket.assignedAgent}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4" /> Customer Name
                    </Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedTicket.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email Address
                    </Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedTicket.email}</p>
                  </div>
                  {selectedTicket.phone && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Phone Number
                      </Label>
                      <p className="text-sm bg-muted p-2 rounded">{selectedTicket.phone}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Created
                    </Label>
                    <p className="text-sm bg-muted p-2 rounded">{formatDate(selectedTicket.createdAt)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Issue Description
                  </Label>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  {selectedTicket.status === "open" && (
                    <Button
                      onClick={() => updateTicketStatus(selectedTicket.id, "in-progress")}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Start Working
                    </Button>
                  )}
                  {selectedTicket.status === "in-progress" && (
                    <Button
                      onClick={() => updateTicketStatus(selectedTicket.id, "closed")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Resolved
                    </Button>
                  )}
                  {selectedTicket.status === "closed" && (
                    <Button onClick={() => updateTicketStatus(selectedTicket.id, "open")} variant="outline">
                      <XCircle className="w-4 h-4 mr-2" />
                      Reopen Ticket
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
