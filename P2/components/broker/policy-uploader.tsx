"use client"

import type React from "react"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Policy {
  name: string
  type: string
  coverage: number
  premium: number
  duration: number
}

const DUMMY_POLICIES: Policy[] = [
  {
    name: "GreenTech Corp General Liability",
    type: "General Liability",
    coverage: 5,
    premium: 0.25,
    duration: 365,
  },
  {
    name: "StartupHub Cyber Insurance",
    type: "Cyber",
    coverage: 2,
    premium: 0.15,
    duration: 365,
  },
  {
    name: "BuildCo Property Coverage",
    type: "Property",
    coverage: 15,
    premium: 0.8,
    duration: 365,
  },
  {
    name: "TechVentures D&O Policy",
    type: "D&O",
    coverage: 10,
    premium: 0.5,
    duration: 365,
  },
  {
    name: "ConsultingPro Workers Comp",
    type: "Workers Compensation",
    coverage: 3,
    premium: 0.12,
    duration: 365,
  },
]

interface PolicyUploaderProps {
  onPoliciesLoad?: (policies: Policy[]) => void
}

export function PolicyUploader({ onPoliciesLoad }: PolicyUploaderProps) {
  const [loaded, setLoaded] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)

  const handleLoadDummyPolicies = () => {
    setLoaded(true)
    setUploadedCount(DUMMY_POLICIES.length)

    // Store in session storage for the app to use
    sessionStorage.setItem("dummyPolicies", JSON.stringify(DUMMY_POLICIES))

    onPoliciesLoad?.(DUMMY_POLICIES)

    setTimeout(() => {
      setLoaded(false)
    }, 2000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.split("\n")
        const headers = lines[0].split(",").map((h) => h.trim())

        const policies: Policy[] = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = line.split(",").map((v) => v.trim())
            return {
              name: values[headers.indexOf("name")] || "Unnamed Policy",
              type: values[headers.indexOf("type")] || "General Liability",
              coverage: Number.parseFloat(values[headers.indexOf("coverage")]) || 0,
              premium: Number.parseFloat(values[headers.indexOf("premium")]) || 0,
              duration: Number.parseInt(values[headers.indexOf("duration")]) || 365,
            }
          })

        setUploadedCount(policies.length)
        sessionStorage.setItem("uploadedPolicies", JSON.stringify(policies))
        onPoliciesLoad?.(policies)

        setTimeout(() => {
          setLoaded(false)
        }, 2000)
      } catch (error) {
        console.error("[v0] Error parsing CSV:", error)
        alert("Failed to parse CSV file")
      }
    }
    reader.readAsText(file)
  }

  return (
    <Card className="p-6 bg-card border border-border">
      <h3 className="font-semibold mb-4 text-foreground">Upload Business Policies</h3>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <label className="cursor-pointer">
            <span className="text-sm font-medium text-primary hover:underline">Click to upload CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            Expected columns: name, type, coverage, premium, duration
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div>
          <Button
            onClick={handleLoadDummyPolicies}
            variant="outline"
            className="w-full bg-transparent"
            disabled={loaded}
          >
            {loaded ? `Loaded ${uploadedCount} sample policies` : "Load Sample Policies"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">5 realistic business policies for demo</p>
        </div>
      </div>
    </Card>
  )
}
