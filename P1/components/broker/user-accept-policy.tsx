"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getContractReadOnly, getContract, formatHash, formatEther } from "@/lib/web3-utils"
import type { Policy } from "@/lib/types"

interface UserAcceptPolicyProps {
  customerAddress: string
  onPolicySigned?: () => void
}

export function UserAcceptPolicy({ customerAddress, onPolicySigned }: UserAcceptPolicyProps) {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(false)
  const [signingHash, setSigningHash] = useState<string | null>(null)
  const [signedPolicies, setSignedPolicies] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadPendingPolicies()
  }, [customerAddress])

  const loadPendingPolicies = async () => {
    try {
      const contract = await getContractReadOnly()
      const policyCount = await contract.allPolicyHashes.length

      const allPolicies: Policy[] = []

      for (let i = 0; i < Math.min(policyCount, 50); i++) {
        const hash = await contract.allPolicyHashes(i)
        const policy = await contract.getPolicy(hash)

        // Only show pending policies for this customer
        if (policy.customer?.toLowerCase() === customerAddress.toLowerCase() && policy.status === 0) {
          allPolicies.push(policy)
        }
      }

      setPolicies(allPolicies)
    } catch (error) {
      console.error("[v0] Error loading policies:", error)
    }
  }

  const handleSignPolicy = async (policyHash: string) => {
    setSigningHash(policyHash)
    setLoading(true)
    try {
      const contract = await getContract()
      const tx = await contract.signPolicy(policyHash)
      await tx.wait()

      setSignedPolicies(new Set([...signedPolicies, policyHash]))
      onPolicySigned?.()

      setTimeout(() => {
        loadPendingPolicies()
      }, 1000)
    } catch (error) {
      console.error("[v0] Error signing policy:", error)
      alert("Failed to sign policy")
    } finally {
      setLoading(false)
      setSigningHash(null)
    }
  }

  const pendingPolicies = policies.filter((p) => !signedPolicies.has(p.policyHash))

  if (pendingPolicies.length === 0) {
    return (
      <Card className="p-6 bg-card border border-border text-center">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No pending policies to sign</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Pending Policy Approvals</h3>

      {pendingPolicies.map((policy) => (
        <Card key={policy.policyHash} className="p-4 border-l-4 border-l-yellow-500 bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-semibold text-foreground">{policy.policyName}</h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                <div>
                  <span className="text-xs font-medium">Type:</span> {policy.policyType}
                </div>
                <div>
                  <span className="text-xs font-medium">Coverage:</span> {formatEther(policy.coverageAmount)} ETH
                </div>
                <div>
                  <span className="text-xs font-medium">Premium:</span> {formatEther(policy.premium)} ETH
                </div>
                <div>
                  <span className="text-xs font-medium">Duration:</span> {Math.floor(Number(policy.duration) / 86400)}{" "}
                  days
                </div>
              </div>

              {policy.notes && (
                <p className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium">Notes:</span> {policy.notes}
                </p>
              )}

              <p className="text-xs text-muted-foreground font-mono">{formatHash(policy.policyHash)}</p>
            </div>

            <Button
              onClick={() => handleSignPolicy(policy.policyHash)}
              disabled={loading && signingHash === policy.policyHash}
              className="shrink-0"
            >
              {loading && signingHash === policy.policyHash ? "Signing..." : "Accept & Sign"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
