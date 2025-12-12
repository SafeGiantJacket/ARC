"use client"

import { useState } from "react"
import { Search, Save, Trash2 } from "lucide-react"

interface AdvancedSearchFiltersProps {
  filters: {
    searchText: string
    policyType: string
    status: string
    expiryRange: [number, number]
    premiumRange: [number, number]
    urgency: string
  }
  onFiltersChange: (filters: AdvancedSearchFiltersProps["filters"]) => void
  savedFilters: Array<{
    id: string
    name: string
    filters: AdvancedSearchFiltersProps["filters"]
  }>
  onSaveFilter: (name: string) => void
  onLoadFilter: (id: string) => void
  onDeleteFilter: (id: string) => void
  dataMode: "csv" | "blockchain"
}

export function AdvancedSearchFilters({
  filters,
  onFiltersChange,
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
  dataMode,
}: AdvancedSearchFiltersProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState("")
  const [expandedSection, setExpandedSection] = useState<string>("search")

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchText: value })
  }

  const handlePolicyTypeChange = (value: string) => {
    onFiltersChange({ ...filters, policyType: value })
  }

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value })
  }

  const handleExpiryRangeChange = (range: [number, number]) => {
    onFiltersChange({ ...filters, expiryRange: range })
  }

  const handlePremiumRangeChange = (range: [number, number]) => {
    onFiltersChange({ ...filters, premiumRange: range })
  }

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      onSaveFilter(filterName)
      setFilterName("")
      setShowSaveDialog(false)
    }
  }

  const POLICY_TYPES = ["All", "General Liability", "Workers Compensation", "Cyber", "Property", "D&O"]

  const STATUSES = ["All", "Quote", "Submitted", "Declined", "Approved"]

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by client, placement ID, coverage type..."
          value={filters.searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Filter Sections */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Policy Type */}
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="text-sm font-semibold text-foreground mb-2 block">
            {dataMode === "csv" ? "Product Line" : "Policy Type"}
          </label>
          <select
            value={filters.policyType}
            onChange={(e) => handlePolicyTypeChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          >
            {POLICY_TYPES.map((type) => (
              <option key={type} value={type.toLowerCase()}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="text-sm font-semibold text-foreground mb-2 block">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status.toLowerCase()}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Expiry Range */}
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="text-sm font-semibold text-foreground mb-2 block">Days to Expiry</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={filters.expiryRange[0]}
              onChange={(e) => handleExpiryRangeChange([Number.parseInt(e.target.value) || 0, filters.expiryRange[1]])}
              placeholder="Min"
              className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
            <input
              type="number"
              value={filters.expiryRange[1]}
              onChange={(e) =>
                handleExpiryRangeChange([filters.expiryRange[0], Number.parseInt(e.target.value) || 365])
              }
              placeholder="Max"
              className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>
        </div>

        {/* Premium Range */}
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="text-sm font-semibold text-foreground mb-2 block">Premium Range ($)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={filters.premiumRange[0]}
              onChange={(e) =>
                handlePremiumRangeChange([Number.parseInt(e.target.value) || 0, filters.premiumRange[1]])
              }
              placeholder="Min"
              className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
            <input
              type="number"
              value={filters.premiumRange[1]}
              onChange={(e) =>
                handlePremiumRangeChange([filters.premiumRange[0], Number.parseInt(e.target.value) || 1000000])
              }
              placeholder="Max"
              className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>
        </div>
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Saved Filters</h3>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map((saved) => (
              <div
                key={saved.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border"
              >
                <button
                  onClick={() => onLoadFilter(saved.id)}
                  className="text-sm text-foreground hover:text-primary transition-colors"
                >
                  {saved.name}
                </button>
                <button
                  onClick={() => onDeleteFilter(saved.id)}
                  className="p-1 hover:bg-destructive/20 rounded transition-colors"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
        >
          <Save className="h-4 w-4" />
          Save Current Filter
        </button>

        <button
          onClick={() =>
            onFiltersChange({
              searchText: "",
              policyType: "all",
              status: "all",
              expiryRange: [0, 180],
              premiumRange: [0, 1000000],
              urgency: "all",
            })
          }
          className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium"
        >
          Reset Filters
        </button>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Save Filter</h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Enter filter name (e.g., 'High Priority 30 Days')"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveFilter}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
