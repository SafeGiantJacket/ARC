"use client"

import { useState, useEffect } from "react"
import { connectWallet, getCurrentAccount, formatAddress, normalizeAddress } from "@/lib/web3-utils"
import { UserDashboard } from "@/components/user/user-dashboard"
import { BrokerDashboard } from "@/components/broker/broker-dashboard"
import { ThemeToggle } from "@/components/theme-toggle"
import { Shield, User, Briefcase, Wallet, LogOut, Database, Link } from "lucide-react"
import type { DataMode } from "@/lib/types"

type Role = "select" | "user" | "broker"

export default function HomePage() {
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [role, setRole] = useState<Role>("select")
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [dataMode, setDataMode] = useState<DataMode>("csv")

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const account = await getCurrentAccount()
      if (account) {
        setUserAddress(normalizeAddress(account))
      }
    } catch (error) {
      console.log("[v0] No existing connection")
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const address = await connectWallet()
      setUserAddress(normalizeAddress(address))
    } catch (error) {
      console.error("Connection failed:", error)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setUserAddress(null)
    setRole("select")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Connect wallet screen
  if (!userAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Policy System</h1>
              <p className="text-muted-foreground mt-2">Policy management with AI-powered insights</p>
            </div>

            <div className="w-full p-4 rounded-xl bg-card border border-border">
              <p className="text-sm text-muted-foreground mb-3">Select Data Mode</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDataMode("csv")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                    dataMode === "csv"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">CSV Data</span>
                </button>
                <button
                  onClick={() => setDataMode("blockchain")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                    dataMode === "blockchain"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  <Link className="h-4 w-4" />
                  <span className="text-sm font-medium">Blockchain</span>
                </button>
              </div>
            </div>

            {dataMode === "blockchain" ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Wallet className="h-5 w-5" />
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <button
                onClick={() => setDataMode("blockchain")}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
              >
                <Database className="h-5 w-5" />
                Load CSV Data Instead
              </button>
            )}

            <p className="text-xs text-muted-foreground">
              {dataMode === "blockchain"
                ? "Connect your MetaMask wallet to get started with blockchain mode"
                : "Load CSV file to get started with CSV data mode"}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Role selection screen
  if (role === "select") {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <header className="flex items-center justify-between py-4 mb-12">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold text-lg">Policy System</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
                <button
                  onClick={() => setDataMode("csv")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    dataMode === "csv" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  CSV
                </button>
                <button
                  onClick={() => setDataMode("blockchain")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    dataMode === "blockchain" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Link className="h-3.5 w-3.5" />
                  Chain
                </button>
              </div>
              <ThemeToggle />
              <div className="px-4 py-2 rounded-lg bg-card border border-border">
                <span className="text-sm text-muted-foreground">{formatAddress(userAddress)}</span>
              </div>
              <button onClick={handleDisconnect} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </header>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-3">Select Your Role</h1>
            <p className="text-muted-foreground text-lg">
              Mode:{" "}
              <span className="text-primary font-medium">
                {dataMode === "csv" ? "CSV Data Feed" : "Live Blockchain"}
              </span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setRole("user")}
              className="group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all text-left"
            >
              <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                <User className="h-7 w-7 text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Customer</h2>
              <p className="text-muted-foreground mb-6">
                View your policies, sign pending agreements, and manage renewals for your coverage.
              </p>
              <div className="flex items-center gap-2 text-primary font-medium">
                Continue as Customer
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            <button
              onClick={() => setRole("broker")}
              className="group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all text-left"
            >
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Briefcase className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Broker</h2>
              <p className="text-muted-foreground mb-6">
                Manage renewals pipeline, create policies, AI briefs, and analytics dashboard.
              </p>
              <div className="flex items-center gap-2 text-primary font-medium">
                Continue as Broker
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard views
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">Policy System</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              {role === "user" ? "Customer Dashboard" : "Broker Dashboard"}
            </span>
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium ${dataMode === "csv" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}
            >
              {dataMode === "csv" ? "CSV Mode" : "Blockchain Mode"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
              <button
                onClick={() => setDataMode("csv")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                  dataMode === "csv" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                onClick={() => setDataMode("blockchain")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                  dataMode === "blockchain" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Link className="h-3.5 w-3.5" />
                Chain
              </button>
            </div>
            <ThemeToggle />
            <button
              onClick={() => setRole("select")}
              className="px-4 py-2 text-sm rounded-lg hover:bg-secondary transition-colors"
            >
              Switch Role
            </button>
            <div className="px-4 py-2 rounded-lg bg-card border border-border">
              <span className="text-sm font-mono">{formatAddress(userAddress)}</span>
            </div>
            <button onClick={handleDisconnect} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <LogOut className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {role === "user" && <UserDashboard userAddress={userAddress} />}
        {role === "broker" && <BrokerDashboard brokerAddress={userAddress} dataMode={dataMode} />}
      </main>
    </div>
  )
}
