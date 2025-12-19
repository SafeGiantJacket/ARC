"use client"

import { useState, useEffect, useCallback } from "react"
import { getContract, getContractReadOnly, formatEther, formatHash, formatDuration } from "@/lib/web3-utils"
import type { Policy } from "@/lib/types"
import { CheckCircle, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"

interface AcceptPolicySectionProps {
  userAddress: string
  onPolicySigned?: () => void
}

export function AcceptPolicySection({ userAddress, onPolicySigned }: AcceptPolicySectionProps) {
  const [pendingPolicies, setPendingPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [signingHash, setSigningHash] = useState<string | null>(null)
  const [expandedHash, setExpandedHash] = useState<string | null>(null)

  const loadPendingPolicies = useCallback(async () => {
    setLoading(true)
    try {
      const contract = await getContractReadOnly()

      // Filter for PolicyCreated events where the customer is the current user
      const filter = contract.filters.PolicyCreated(null, userAddress)
      const events = await contract.queryFilter(filter)

      const pendingPoliciesData: Policy[] = []

      // Use a Set to avoid duplicates if multiple events exist for same hash (unlikely but safe)
      const processedHashes = new Set<string>()

      for (const event of events) {
        if ('args' in event) {
          const hash = event.args[0]
          if (processedHashes.has(hash)) continue
          processedHashes.add(hash)

          try {
            const policy = await contract.getPolicy(hash)
            // Double check status is Pending (0)
            if (policy.status === 0) {
              pendingPoliciesData.push(policy)
            }
          } catch (e) {
            console.log("[v0] Error fetching policy details:", hash)
          }
        }
      }

      setPendingPolicies(pendingPoliciesData)
    } catch (error) {
      console.error("[v0] Error loading pending policies:", error)
    } finally {
      setLoading(false)
    }
  }, [userAddress])

  useEffect(() => {
    loadPendingPolicies()
  }, [loadPendingPolicies])

  const handleAcceptPolicy = async (policyHash: string) => {
    setSigningHash(policyHash)
    try {
      const contract = await getContract()
      const tx = await contract.signPolicy(policyHash)
      await tx.wait()
      await loadPendingPolicies()
      onPolicySigned?.()
    } catch (error: unknown) {
      const err = error as { reason?: string; message?: string }
      console.error("[v0] Sign error:", err)
      alert(err.reason || err.message || "Failed to sign policy")
    } finally {
      setSigningHash(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (pendingPolicies.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg bg-card border border-border">
        <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No pending policies to sign</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Policies Awaiting Your Signature</h2>
          <p className="text-muted-foreground mt-1">
            {pendingPolicies.length} policy{pendingPolicies.length !== 1 ? "ies" : ""} waiting for your approval
          </p>
        </div>
        <button
          onClick={loadPendingPolicies}
          className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pendingPolicies.map((policy) => (
          <Card
            key={policy.policyHash}
            className="border border-border overflow-hidden hover:border-primary/50 transition-colors"
          >
            <div className="p-6">
              {/* Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{policy.policyName}</h3>
                    <p className="text-sm text-muted-foreground">{policy.policyType}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
                    Pending Signature
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground">{formatHash(policy.policyHash)}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Coverage Amount</p>
                  <p className="font-semibold text-lg">{formatEther(policy.coverageAmount)} ETH</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Premium</p>
                  <p className="font-semibold text-lg text-primary">{formatEther(policy.premium)} ETH</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="font-semibold">{Math.floor(Number(policy.duration) / 86400)} days</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Broker</p>
                  <p className="text-xs font-mono">{policy.broker ? formatHash(policy.broker) : "System"}</p>
                </div>
              </div>

              {/* Notes */}
              {policy.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Notes from Broker</p>
                  <p className="text-sm text-foreground">{policy.notes}</p>
                </div>
              )}

              {/* Expandable Details */}
              {expandedHash === policy.policyHash && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Policy Hash:</span>
                      <span className="font-mono">{policy.policyHash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Broker Address:</span>
                      <span className="font-mono">{policy.broker || "System"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setExpandedHash(expandedHash === policy.policyHash ? null : policy.policyHash)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-sm font-medium"
                >
                  {expandedHash === policy.policyHash ? "Hide Details" : "View Details"}
                </button>
                <button
                  onClick={() => handleAcceptPolicy(policy.policyHash)}
                  disabled={signingHash === policy.policyHash}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {signingHash === policy.policyHash ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Accept & Sign
                    </>
                  )}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
