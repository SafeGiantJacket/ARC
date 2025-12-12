"use client"

import { useState, useMemo, useCallback } from "react"
import type { Policy, InsurancePlacement, DataMode } from "@/lib/types"
import { AdvancedAnalyticsDashboard } from "@/components/broker/advanced-analytics-dashboard"
import { AdvancedSearchFilters } from "@/components/broker/advanced-search-filters"

// Mock data
const MOCK_POLICIES: Policy[] = [
  {
    policyHash: "0x1a2b3c",
    policyName: "TechCorp General Liability",
    policyType: "General Liability",
    coverageAmount: BigInt("5000000000000000000"), // 5 ETH
    premium: BigInt("500000000000000000"), // 0.5 ETH
    startTime: BigInt(Math.floor(Date.now() / 1000) - 86400 * 180),
    duration: BigInt(86400 * 365),
    renewalCount: BigInt(2),
    notes: "Active renewal needed",
    status: 1,
    customer: "0xabcd1234",
  },
  // Add more policies as needed
]

const MOCK_PLACEMENTS: InsurancePlacement[] = [
  {
    client: "Global Manufacturing Inc",
    placementClientLocalId: "CLI-001",
    placementName: "Workers Compensation",
    coverage: "Workers Comp Coverage",
    productLine: "Workers Compensation",
    carrierGroup: "AIG Group",
    placementCreatedDateTime: "2025-01-15T10:00:00",
    placementCreatedBy: "John Smith",
    placementCreatedById: "USER-001",
    responseReceivedDate: "2025-01-20T15:30:00",
    placementSpecialist: "Sarah Johnson",
    placementRenewingStatus: "In Progress",
    placementStatus: "Quote",
    declinationReason: "",
    placementId: "PLC-001",
    placementEffectiveDate: "2025-02-01",
    placementExpiryDate: "2026-02-01",
    incumbentIndicator: "Y",
    participationStatusCode: "ACTIVE",
    placementClientSegmentCode: "CLIENT_SEGMENT_RISK_MGMT",
    placementRenewingStatusCode: "RENEWAL_IN_PROGRESS",
    limit: 1000000,
    coveragePremiumAmount: 45000,
    triaPremium: 2000,
    totalPremium: 47000,
    commissionPercent: 15,
    commissionAmount: 7050,
    participationPercentage: 100,
    carrierGroupLocalId: "CG-AIG",
    productionCode: "PROD-WC",
    submissionSentDate: "2025-01-18",
    programProductLocalCodeText: "WC-STD",
    approachNonAdmittedMarketIndicator: "N",
    carrierIntegration: "Direct",
    daysUntilExpiry: 380,
    priorityScore: 65,
  },
]

export default function AdvancedDashboardPage() {
  const [dataMode, setDataMode] = useState<DataMode>("csv")
  const [filters, setFilters] = useState({
    searchText: "",
    policyType: "all",
    status: "all",
    expiryRange: [0, 180],
    premiumRange: [0, 1000000],
    urgency: "all",
  })
  const [savedFilters, setSavedFilters] = useState<
    Array<{
      id: string
      name: string
      filters: typeof filters
    }>
  >([])

  const filteredData = useMemo(() => {
    if (dataMode === "csv") {
      return MOCK_PLACEMENTS.filter((placement) => {
        const matchesSearch =
          filters.searchText === "" ||
          placement.client.toLowerCase().includes(filters.searchText.toLowerCase()) ||
          placement.placementId.toLowerCase().includes(filters.searchText.toLowerCase()) ||
          placement.coverage.toLowerCase().includes(filters.searchText.toLowerCase())

        const matchesType = filters.policyType === "all" || placement.productLine === filters.policyType

        const matchesStatus = filters.status === "all" || placement.placementStatus === filters.status

        const matchesExpiry =
          placement.daysUntilExpiry >= filters.expiryRange[0] && placement.daysUntilExpiry <= filters.expiryRange[1]

        const matchesPremium =
          placement.totalPremium >= filters.premiumRange[0] && placement.totalPremium <= filters.premiumRange[1]

        return matchesSearch && matchesType && matchesStatus && matchesExpiry && matchesPremium
      })
    }

    return MOCK_POLICIES
  }, [filters, dataMode])

  const handleSaveFilter = useCallback(
    (filterName: string) => {
      setSavedFilters((prev) => [
        ...prev,
        {
          id: `filter_${Date.now()}`,
          name: filterName,
          filters,
        },
      ])
    },
    [filters],
  )

  const handleLoadFilter = useCallback(
    (filterId: string) => {
      const saved = savedFilters.find((f) => f.id === filterId)
      if (saved) {
        setFilters(saved.filters)
      }
    },
    [savedFilters],
  )

  const handleDeleteFilter = useCallback((filterId: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== filterId))
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Advanced Broker Dashboard</h1>
            <p className="text-muted-foreground mt-1">Analytics, search, and filtering for renewal management</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDataMode("csv")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dataMode === "csv"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              CSV Mode
            </button>
            <button
              onClick={() => setDataMode("blockchain")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dataMode === "blockchain"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Blockchain
            </button>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <AdvancedAnalyticsDashboard
          data={filteredData}
          dataMode={dataMode}
          totalData={dataMode === "csv" ? MOCK_PLACEMENTS : MOCK_POLICIES}
        />

        {/* Search & Filters */}
        <AdvancedSearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          savedFilters={savedFilters}
          onSaveFilter={handleSaveFilter}
          onLoadFilter={handleLoadFilter}
          onDeleteFilter={handleDeleteFilter}
          dataMode={dataMode}
        />

        {/* Results Summary */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredData.length}</span> of{" "}
            <span className="font-semibold text-foreground">
              {dataMode === "csv" ? MOCK_PLACEMENTS.length : MOCK_POLICIES.length}
            </span>{" "}
            {dataMode === "csv" ? "placements" : "policies"}
          </p>
        </div>
      </div>
    </div>
  )
}
