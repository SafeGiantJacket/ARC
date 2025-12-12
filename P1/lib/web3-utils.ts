import { ethers } from "ethers"
import contractABI from "./contract-abi.json"

export const CONTRACT_ADDRESS = "0x2e6D92CFc80616637dC67a61DcF11e3859ad852f"

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not installed")
  }
  return new ethers.BrowserProvider(window.ethereum)
}

export async function getContract() {
  const provider = await getProvider()
  const signer = await provider.getSigner()
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer)
}

export async function getContractReadOnly() {
  const provider = await getProvider()
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider)
}

export async function connectWallet(): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not installed")
  }
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[]
  return accounts[0]
}

export async function getCurrentAccount(): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) return null
  const accounts = (await window.ethereum.request({
    method: "eth_accounts",
  })) as string[]
  return accounts[0] || null
}

export function formatHash(hash: string): string {
  if (!hash) return ""
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

export function formatAddress(address: string): string {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatEther(value: bigint): string {
  return ethers.formatEther(value)
}

export function parseEther(value: string): bigint {
  return ethers.parseEther(value)
}

export function formatDate(timestamp: number | bigint): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp
  if (ts === 0) return "Not started"
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDuration(seconds: number | bigint): string {
  const secs = typeof seconds === "bigint" ? Number(seconds) : seconds
  const days = Math.floor(secs / 86400)
  return `${days} days`
}

export function getPolicyStatusText(status: number): string {
  const statuses = ["Pending Signature", "Active", "Expired"]
  return statuses[status] || "Unknown"
}

export function getPolicyStatusColor(status: number): string {
  switch (status) {
    case 0:
      return "text-yellow-400"
    case 1:
      return "text-primary"
    case 2:
      return "text-destructive"
    default:
      return "text-muted-foreground"
  }
}

// Check if policy is expired based on time
export function isPolicyExpired(startTime: bigint, duration: bigint): boolean {
  if (startTime === 0n) return false
  const endTime = Number(startTime) + Number(duration)
  return Date.now() / 1000 > endTime
}

export function getExpiryDate(startTime: bigint, duration: bigint): string {
  if (startTime === 0n) return "N/A"
  const endTime = (Number(startTime) + Number(duration)) * 1000
  return new Date(endTime).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function normalizeAddress(address: string): string {
  return address ? address.toLowerCase() : ""
}

export function addressesMatch(address1: string, address2: string): boolean {
  return normalizeAddress(address1) === normalizeAddress(address2)
}
