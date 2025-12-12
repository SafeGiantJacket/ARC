"use client"

import { useState, useEffect } from "react"
import { Sticker as Sticky, Plus, Trash2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import type { Placement } from "@/lib/types"

interface BrokerNote {
  id: string
  placement_id: string
  note_title: string
  note_content: string
  note_category: string
  tags: string[]
  created_at: string
}

interface BrokerNotesProps {
  placements: Placement[]
}

export function BrokerNotes({ placements }: BrokerNotesProps) {
  const [notes, setNotes] = useState<BrokerNote[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    placement_id: "",
    note_title: "",
    note_content: "",
    note_category: "general",
    tags: "",
  })
  const [loading, setLoading] = useState(false)
  const [brokerIdLoaded, setBrokerIdLoaded] = useState(false)
  const [brokerId, setBrokerId] = useState("")

  const supabase = createClient()

  useEffect(() => {
    const stored = localStorage.getItem("broker_id")
    if (stored) {
      setBrokerId(stored)
      setBrokerIdLoaded(true)
    } else {
      const id = `broker_${Date.now()}`
      localStorage.setItem("broker_id", id)
      setBrokerId(id)
      setBrokerIdLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (brokerIdLoaded && brokerId) {
      loadNotes()
    }
  }, [brokerIdLoaded, brokerId])

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("broker_notes")
        .select("*")
        .eq("broker_id", brokerId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error("[v0] Failed to load notes:", error)
    }
  }

  const handleAddNote = async () => {
    if (!formData.placement_id || !formData.note_title || !formData.note_content) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const tags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t)

      const { error } = await supabase.from("broker_notes").insert({
        broker_id: brokerId,
        placement_id: formData.placement_id,
        note_title: formData.note_title,
        note_content: formData.note_content,
        note_category: formData.note_category,
        tags,
      })

      if (error) throw error

      setFormData({
        placement_id: "",
        note_title: "",
        note_content: "",
        note_category: "general",
        tags: "",
      })
      setShowForm(false)
      await loadNotes()
    } catch (error) {
      console.error("[v0] Failed to add note:", error)
      alert("Failed to add note")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase.from("broker_notes").delete().eq("id", noteId)

      if (error) throw error
      await loadNotes()
    } catch (error) {
      console.error("[v0] Failed to delete note:", error)
    }
  }

  const categoryColors: Record<string, string> = {
    general: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    important: "bg-red-500/10 text-red-600 dark:text-red-400",
    followup: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    issue: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Sticky className="h-5 w-5" />
          Personal Notes
        </h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 bg-secondary/50 border-2 border-primary/20">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Placement</label>
              <select
                value={formData.placement_id}
                onChange={(e) => setFormData({ ...formData, placement_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              >
                <option value="">Select placement...</option>
                {placements.map((p) => (
                  <option key={p.clientName} value={p.clientName}>
                    {p.clientName} - {p.policyType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input
                value={formData.note_title}
                onChange={(e) => setFormData({ ...formData, note_title: e.target.value })}
                placeholder="Note title..."
                className="text-foreground"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Note Content</label>
              <Textarea
                value={formData.note_content}
                onChange={(e) => setFormData({ ...formData, note_content: e.target.value })}
                placeholder="Write your note..."
                className="text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-foreground">Category</label>
                <select
                  value={formData.note_category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      note_category: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                >
                  <option value="general">General</option>
                  <option value="important">Important</option>
                  <option value="followup">Follow-up</option>
                  <option value="issue">Issue</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Tags (comma-separated)</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., urgent, client"
                  className="text-foreground"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddNote} disabled={loading} className="flex-1">
                {loading ? "Saving..." : "Save Note"}
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Notes List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-4 bg-card border-l-4 border-l-amber-500">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">{note.note_title}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        categoryColors[note.note_category] || categoryColors.general
                      }`}
                    >
                      {note.note_category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{note.note_content}</p>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {note.placement_id} • {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
