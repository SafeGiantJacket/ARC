"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Mail, Calendar, Brain, Activity, Check } from "lucide-react"
import { useEffect, useState } from "react"

interface ConnectorGraphProps {
    emailCount?: number
    calendarCount?: number
}

export function ConnectorGraph({ emailCount = 0, calendarCount = 0 }: ConnectorGraphProps) {
    const [activeNode, setActiveNode] = useState<number | null>(null)

    useEffect(() => {
        // Trigger pulse when counts change
        if (emailCount > 0) {
            setActiveNode(1)
            setTimeout(() => setActiveNode(null), 1000)
        }
    }, [emailCount])

    useEffect(() => {
        if (calendarCount > 0) {
            setActiveNode(2)
            setTimeout(() => setActiveNode(null), 1000)
        }
    }, [calendarCount])

    return (
        <Card className="w-full relative overflow-hidden bg-white text-slate-900 border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-400">
                    <Activity className="w-4 h-4 text-blue-500" />
                    Live Data Context
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center relative">

                {/* Central Brain Node */}
                <div className="z-10 bg-white p-4 rounded-full shadow-lg border-2 border-blue-100 relative">
                    <Brain className="w-8 h-8 text-blue-600" />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 text-nowrap">
                        Broker Copilot
                    </div>
                </div>

                {/* Satellite Nodes */}
                {/* CRM */}
                <div className="absolute left-[15%] top-[50%] -translate-y-[50%] flex flex-col items-center gap-2">
                    <div className={`p-3 rounded-full border transition-all duration-500 bg-white ${activeNode === 0 ? "border-green-500 scale-110 shadow-lg" : "border-slate-200"}`}>
                        <Database className={`w-5 h-5 ${activeNode === 0 ? "text-green-500" : "text-slate-400"}`} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">CRM</span>
                </div>

                {/* Email */}
                <div className="absolute right-[15%] top-[20%] flex flex-col items-center gap-2">
                    <div className={`p-3 rounded-full border transition-all duration-500 bg-white ${activeNode === 1 ? "border-purple-500 scale-110 shadow-lg" : "border-slate-200"}`}>
                        <Mail className={`w-5 h-5 ${activeNode === 1 ? "text-purple-500" : "text-slate-400"}`} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Gmail</span>
                </div>

                {/* Calendar */}
                <div className="absolute right-[15%] bottom-[20%] flex flex-col items-center gap-2">
                    <div className={`p-3 rounded-full border transition-all duration-500 bg-white ${activeNode === 2 ? "border-yellow-500 scale-110 shadow-lg" : "border-slate-200"}`}>
                        <Calendar className={`w-5 h-5 ${activeNode === 2 ? "text-yellow-500" : "text-slate-400"}`} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Outlook</span>
                </div>

                {/* Connecting Lines (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                    {/* Line to CRM */}
                    <line x1="19%" y1="50%" x2="46%" y2="50%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-300" />
                    {/* Line to Email */}
                    <line x1="81%" y1="28%" x2="54%" y2="45%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-300" />
                    {/* Line to Calendar */}
                    <line x1="81%" y1="72%" x2="54%" y2="55%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-300" />
                </svg>

                {/* Pulsing Packets */}
                {activeNode === 0 && (
                    <div className="absolute left-[20%] top-[48%] w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDuration: '0.8s' }} />
                )}
                {activeNode === 1 && (
                    <div className="absolute right-[20%] top-[30%] w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDuration: '0.8s' }} />
                )}
                {activeNode === 2 && (
                    <div className="absolute right-[20%] bottom-[30%] w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDuration: '0.8s' }} />
                )}

            </CardContent>
        </Card>
    )
}
