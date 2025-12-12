"use client"

import { useState } from "react"
import type { RenewalPipelineItem } from "@/lib/types"
import { X, Edit3, AlertTriangle, Save } from "lucide-react"

interface ScoreOverrideModalProps {
  item: RenewalPipelineItem
  currentOverride?: { score: number; reason: string }
  onClose: () => void
  onSave: (score: number, reason: string) => void
}

export function ScoreOverrideModal({ item, currentOverride, onClose, onSave }: ScoreOverrideModalProps) {
  const originalScore = item.scoreBreakdown?.total ?? item.priorityScore
  const [score, setScore] = useState(currentOverride?.score ?? originalScore)
  const [reason, setReason] = useState(currentOverride?.reason ?? "")

  const getName = () => item.placement?.client || item.policy?.policyName || "Unknown"

  const handleSave = () => {
    if (!reason.trim()) return
    onSave(score, reason)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-500/10">
              <Edit3 className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Manual Score Override</h2>
              <p className="text-sm text-muted-foreground">{getName()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Current vs New Score */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Calculated Score</p>
              <p className="text-2xl font-bold">{originalScore}</p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Override Score</p>
              <p className="text-2xl font-bold text-yellow-500">{score}</p>
            </div>
          </div>

          {/* Score Slider */}
          <div>
            <label className="block text-sm font-medium mb-2">New Priority Score</label>
            <input
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-yellow-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0 (Low)</span>
              <span>50</span>
              <span>100 (Critical)</span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">Override Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this score is being overridden..."
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">Required for audit trail and explainability</p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-400">
              Manual overrides are logged and displayed alongside calculated scores for transparency.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!reason.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              Save Override
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
