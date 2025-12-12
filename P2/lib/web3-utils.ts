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
  const { ethers } = await import("ethers")
  return new ethers.BrowserProvider(window.ethereum)
}

export async function getContract() {
  const provider = await getProvider()
  const { ethers } = await import("ethers")
  const signer = await provider.getSigner()
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer)
}

export async function getContractReadOnly() {
  const provider = await getProvider()
  const { ethers } = await import("ethers")
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider)
}

export async function connectWallet(): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not installed")
  }

  // Request accounts
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[]

  // Switch to Sepolia network
  await switchToSepolia()

  return accounts[0]
}

/**
 * Switch to Sepolia testnet
 */
export async function switchToSepolia(): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not installed")
  }

  const sepoliaChainId = "0xaa36a7" // 11155111 in hex

  try {
    // Try to switch to Sepolia
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: sepoliaChainId }],
    })
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add Sepolia network
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: sepoliaChainId,
              chainName: "Sepolia Testnet",
              nativeCurrency: {
                name: "Sepolia ETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://sepolia.infura.io/v3/"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        })
      } catch (addError) {
        throw new Error("Failed to add Sepolia network")
      }
    } else {
      throw switchError
    }
  }
}

/**
 * Get current chain ID
 */
export async function getCurrentChainId(): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) return null
  const chainId = (await window.ethereum.request({
    method: "eth_chainId",
  })) as string
  return chainId
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
  const num = Number(value)
  const formatted = (num / 1e18).toFixed(4)
  return formatted.replace(/\.?0+$/, "")
}

export function parseEther(value: string): bigint {
  const num = Number.parseFloat(value)
  const wei = BigInt(Math.floor(num * 1e18))
  return wei
}

/**
 * Convert duration from seconds to days for display
 * Contract stores duration in seconds, we divide by 86400 to get days
 */
export function formatDuration(seconds: number | bigint): string {
  const secs = typeof seconds === "bigint" ? Number(seconds) : seconds
  const days = Math.floor(secs / 86400) // 86400 seconds in a day
  return `${days} days`
}

/**
 * Get duration in days (numeric) from seconds
 * Contract stores duration in seconds, we divide by 86400 to get days
 */
export function getDurationInDays(seconds: number | bigint): number {
  const secs = typeof seconds === "bigint" ? Number(seconds) : seconds
  return Math.floor(secs / 86400)
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

export function isPolicyExpired(startTime: bigint, duration: bigint): boolean {
  if (startTime === BigInt(0)) return false;

  const endTime = Number(startTime) + Number(duration);
  return Date.now() / 1000 > endTime;
}

export function getExpiryDate(startTime: bigint, duration: bigint): string {
  if (startTime === BigInt(0)) return "N/A";

  const endTime = (Number(startTime) + Number(duration)) * 1000;

  return new Date(endTime).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function normalizeAddress(address: string): string {
  return address ? address.toLowerCase() : ""
}

export function addressesMatch(address1: string, address2: string): boolean {
  return normalizeAddress(address1) === normalizeAddress(address2)
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
