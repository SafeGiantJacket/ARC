"use client"

import type React from "react"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getContract } from "@/lib/web3-utils"
import { parseEther } from "@/lib/web3-utils"

interface CreatePolicyProps {
  onPolicyCreated?: () => void
  brokerAddress: string
}

export function BrokerCreatePolicy({ onPolicyCreated, brokerAddress }: CreatePolicyProps) {
  const [formData, setFormData] = useState({
    policyName: "",
    policyType: "",
    coverageAmount: "",
    premium: "",
    durationInDays: "",
    customerAddress: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const contract = await getContract()

      const durationSeconds = Number(formData.durationInDays) * 24 * 60 * 60
      const coverageWei = parseEther(formData.coverageAmount)
      const premiumWei = parseEther(formData.premium)

      const tx = await contract.createPolicy(
        formData.policyName,
        formData.policyType,
        coverageWei,
        premiumWei,
        durationSeconds,
        formData.notes,
        formData.customerAddress,
      )

      await tx.wait()

      setSuccess(true)
      setFormData({
        policyName: "",
        policyType: "",
        coverageAmount: "",
        premium: "",
        durationInDays: "",
        customerAddress: "",
        notes: "",
      })

      setTimeout(() => {
        setShowForm(false)
        setSuccess(false)
        onPolicyCreated?.()
      }, 2000)
    } catch (error) {
      console.error("[v0] Error creating policy:", error)
      alert("Failed to create policy. Check console for details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Create New Policy
        </Button>
      ) : (
        <Card className="p-6 bg-card border border-border">
          <h3 className="text-lg font-semibold mb-4">Create Blockchain Policy</h3>

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-600 dark:text-green-400 text-sm">
              Policy created successfully on blockchain!
            </div>
          )}

          <form onSubmit={handleCreatePolicy} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Policy Name</label>
                <input
                  type="text"
                  value={formData.policyName}
                  onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
                  placeholder="e.g., TechCorp General Liability"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Policy Type</label>
                <select
                  value={formData.policyType}
                  onChange={(e) => setFormData({ ...formData, policyType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                >
                  <option value="">Select type...</option>
                  <option value="General Liability">General Liability</option>
                  <option value="Workers Compensation">Workers Compensation</option>
                  <option value="Cyber">Cyber</option>
                  <option value="Property">Property</option>
                  <option value="D&O">D&O</option>
                  <option value="Auto">Auto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Coverage (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.coverageAmount}
                  onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
                  placeholder="e.g., 10"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Premium (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.premium}
                  onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                  placeholder="e.g., 0.5"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration (Days)</label>
                <input
                  type="number"
                  value={formData.durationInDays}
                  onChange={(e) => setFormData({ ...formData, durationInDays: e.target.value })}
                  placeholder="e.g., 365"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Customer Address</label>
                <input
                  type="text"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional policy details..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Policy"}
              </Button>
              <Button type="button" onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
