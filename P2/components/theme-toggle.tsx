"use client"

import { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check saved preference or system preference
    const saved = localStorage.getItem("theme")
    if (saved) {
      setIsDark(saved === "dark")
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.remove("light")
    } else {
      document.documentElement.classList.add("light")
    }
    localStorage.setItem("theme", isDark ? "dark" : "light")
  }, [isDark, mounted])

  if (!mounted) {
    return <div className="p-2 rounded-lg bg-secondary w-9 h-9" />
  }

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all group"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative h-5 w-5">
        <Sun
          className={`h-5 w-5 absolute inset-0 transition-all duration-300 ${isDark ? "opacity-100 rotate-0 text-yellow-400" : "opacity-0 rotate-90"}`}
        />
        <Moon
          className={`h-5 w-5 absolute inset-0 transition-all duration-300 ${isDark ? "opacity-0 -rotate-90" : "opacity-100 rotate-0 text-blue-400"}`}
        />
      </div>
      <span className="text-xs font-medium hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
    </button>
  )
}
