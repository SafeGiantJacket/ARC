"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getContract,
  getContractReadOnly,
  formatHash,
  formatEther,
  formatDuration,
  getPolicyStatusText,
  getExpiryDate,
} from "@/lib/web3-utils"
import type { Policy } from "@/lib/types"
import { FileText, Clock, RefreshCw, CheckCircle, AlertCircle, Search } from "lucide-react"
import { AcceptPolicySection } from "./accept-policy-section"

interface UserDashboardProps {
  userAddress: string
}

export function UserDashboard({ userAddress }: UserDashboardProps) {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "expired">("all")
  const [searchHash, setSearchHash] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [renewDays, setRenewDays] = useState<Record<string, string>>({})
  const [activeView, setActiveView] = useState<"overview" | "accept">("overview")

  const loadPolicies = useCallback(async () => {
    setLoading(true)
    try {
      const contract = await getContract()
      const readContract = await getContractReadOnly()

      const hashes = await contract.getActivePolicies(userAddress)

      const policiesData: Policy[] = []
      for (const hash of hashes) {
        try {
          const policy = await readContract.getPolicy(hash)
          policiesData.push(policy)
        } catch (e) {
          console.log("[v0] Error fetching policy:", hash)
        }
      }

      setPolicies(policiesData)
    } catch (error) {
      console.error("[v0] Error loading policies:", error)
    } finally {
      setLoading(false)
    }
  }, [userAddress])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  const handleSign = async (policyHash: string) => {
    setActionLoading(policyHash)
    try {
      const contract = await getContract()
      const tx = await contract.signPolicy(policyHash)
      await tx.wait()
      await loadPolicies()
    } catch (error: unknown) {
      const err = error as { reason?: string; message?: string }
      console.error("[v0] Sign error:", err)
      alert(err.reason || err.message || "Failed to sign policy")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRenew = async (policyHash: string) => {
    const days = Number.parseInt(renewDays[policyHash] || "30")
    if (isNaN(days) || days <= 0) {
      alert("Please enter a valid number of days")
      return
    }

    setActionLoading(policyHash)
    try {
      const contract = await getContract()
      const tx = await contract.renew(policyHash, days)
      await tx.wait()
      await loadPolicies()
    } catch (error: unknown) {
      const err = error as { reason?: string; message?: string }
      console.error("[v0] Renew error:", err)
      alert(err.reason || err.message || "Failed to renew policy")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSearchPolicy = async () => {
    if (!searchHash.trim()) return

    setLoading(true)
    try {
      const contract = await getContractReadOnly()
      const policy = await contract.getPolicy(searchHash)

      if (policy.policyHash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        alert("Policy not found")
      } else if (policy.customer.toLowerCase() !== userAddress.toLowerCase()) {
        alert("This policy is not assigned to your address")
      } else {
        const exists = policies.find((p) => p.policyHash === policy.policyHash)
        if (!exists) {
          setPolicies([...policies, policy])
        }
      }
    } catch (error) {
      console.error("[v0] Search error:", error)
      alert("Failed to find policy")
    } finally {
      setLoading(false)
    }
  }

  const filteredPolicies = policies.filter((p) => {
    if (filter === "all") return true
    if (filter === "pending") return p.status === 0
    if (filter === "active") return p.status === 1
    if (filter === "expired") return p.status === 2
    return true
  })

  const stats = {
    total: policies.length,
    pending: policies.filter((p) => p.status === 0).length,
    active: policies.filter((p) => p.status === 1).length,
    expired: policies.filter((p) => p.status === 2).length,
  }

  const handlePolicySigned = useCallback(async () => {
    await loadPolicies()
  }, [loadPolicies])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <button
          onClick={() => setActiveView("overview")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === "overview"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Policies
        </button>
        <button
          onClick={() => setActiveView("accept")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === "accept"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pending Signatures
        </button>
      </div>

      {activeView === "accept" && <AcceptPolicySection userAddress={userAddress} onPolicySigned={handlePolicySigned} />}

      {activeView === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Policies</span>
              </div>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-yellow-400" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <div className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
              <p className="text-3xl font-bold text-primary">{stats.active}</p>
            </div>
            <div className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm text-muted-foreground">Expired</span>
              </div>
              <p className="text-3xl font-bold text-destructive">{stats.expired}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by policy hash..."
                  value={searchHash}
                  onChange={(e) => setSearchHash(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={handleSearchPolicy}
                className="px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors font-medium"
              >
                Search
              </button>
            </div>
            <button
              onClick={loadPolicies}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="flex gap-2 p-1 rounded-xl bg-card border border-border w-fit">
            {(["all", "pending", "active", "expired"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Loading policies...</p>
              </div>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="text-center py-20 rounded-xl bg-card border border-border">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Policies Found</h3>
              <p className="text-muted-foreground">
                {filter === "all"
                  ? "You don't have any policies yet. Contact your broker to create one."
                  : `No ${filter} policies found.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPolicies.map((policy) => (
                <div key={policy.policyHash} className="rounded-xl bg-card border border-border overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold">{policy.policyName}</h3>
                        <p className="text-sm text-muted-foreground">{policy.policyType}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          policy.status === 0
                            ? "bg-yellow-500/10 text-yellow-400"
                            : policy.status === 1
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {getPolicyStatusText(policy.status)}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{formatHash(policy.policyHash)}</p>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Coverage</p>
                        <p className="font-semibold">{formatEther(policy.coverageAmount)} ETH</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Premium</p>
                        <p className="font-semibold">{formatEther(policy.premium)} ETH</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Duration</p>
                        <p className="font-semibold">{formatDuration(policy.duration)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {policy.status === 0 ? "Start Date" : "Expires"}
                        </p>
                        <p className="font-semibold">
                          {policy.status === 0 ? "After signing" : getExpiryDate(policy.startTime, policy.duration)}
                        </p>
                      </div>
                    </div>

                    {policy.notes && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{policy.notes}</p>
                      </div>
                    )}

                    {policy.renewalCount > 0n && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Renewed {policy.renewalCount.toString()} time(s)
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-5 bg-secondary/30 border-t border-border">
                    {policy.status === 0 && (
                      <button
                        onClick={() => handleSign(policy.policyHash)}
                        disabled={actionLoading === policy.policyHash}
                        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === policy.policyHash ? "Signing..." : "Sign Policy"}
                      </button>
                    )}

                    {policy.status === 2 && (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Days"
                          value={renewDays[policy.policyHash] || ""}
                          onChange={(e) => setRenewDays({ ...renewDays, [policy.policyHash]: e.target.value })}
                          className="flex-1 px-4 py-3 rounded-lg bg-card border border-border focus:border-primary focus:outline-none"
                        />
                        <button
                          onClick={() => handleRenew(policy.policyHash)}
                          disabled={actionLoading === policy.policyHash}
                          className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === policy.policyHash ? "Renewing..." : "Renew"}
                        </button>
                      </div>
                    )}

                    {policy.status === 1 && (
                      <p className="text-center text-sm text-muted-foreground">Policy is active</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
