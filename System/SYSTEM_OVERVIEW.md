# Broker Copilot Ecosystem: Final Architecture & Implementation Report

## 🏁 Executive Summary
The **Broker Copilot Ecosystem** is a production-grade, dual-engine platform designed to modernize insurance renewal management. It bridges the gap between legacy static data and future-proof decentralized trust, unified by a single high-performance intelligent core.

> **⚠️ MANDATORY ARCHITECTURE STATEMENT**:
> **"No document ingestion, RAG, or embeddings/vector DB used. This system utilizes connector-first in-context synthesis only."**
>
> All intelligence is derived from live API signals (CRM, Email, Calendar, Blockchain) processed in real-time via a deterministic client-side engine.

---

## 🏗️ High-Level System Architecture

The system follows a **Connector-First, Logic-Centralized** architecture with enhanced AI capabilities.

```mermaid
graph TD
    subgraph "Live Signal Layer (Connectors)"
        Mail["Communication Miner (Gmail/Outlook)"]
        Cal["Collaboration (Calendar/Teams)"]
        Chain["Blockchain (Sepolia Testnet)"]
        Pre["Meeting Context (Meeting Prep)"]
    end

    subgraph "Intelligent Core (Client-Side)"
        Parser["Fault-Tolerant Ingester"]
        Engine["Prioritization Engine"]
        NegSim["Negotiation Simulator"]
        CampMgr["Campaign Manager"]
        RelGraph["Relationship Graph"]
    end

    subgraph "Operational Interface"
        Dash["Renewal Dashboard"]
        Coach["Negotiation Coach"]
        Scheduler["Unified Scheduler"]
        Ask["Ask My Data (FAB)"]
    end

    Mail & Cal & Chain & Pre --> |Raw Streams| Parser
    Parser --> |Normalized Data| Engine
    Engine --> |Scored Priorities| Dash
    Engine --> |Context| NegSim
    Engine --> |Target Lists| CampMgr
    Engine --> |Connections| RelGraph
    NegSim --> |Training| Coach
    RelGraph --> |Insights| Dash
```

### Key Modules
1.  **P1 (Enterprise Bridge)**: Ingests static legacy data (CSV) and revitalizes it with AI scoring.
2.  **P2 (Decentralized Future)**: Manages policy lifecycle on Ethereum Sepolia, ensuring trust-minimized execution.
3.  **Negotiation Engine**: AI-driven simulator (`negotiate-chat`) to practice interactions.
4.  **Campaign Manager**: Automated renewal outreach (`generate-campaign-email`) with timeline tracking.
5.  **Relationship Intelligence**: Visualizes connection strength (`relationship-timeline`, `connector-graph`) and prepares for meetings (`meeting-prep-widget`).

---

## 💻 Source Code Structure & Implementation Details

The solution is built on a modern **Next.js 14 (App Router)** stack with **TypeScript**.

### Directory Structure
```text
/FINAL ARC
├── /P2 (Main Application)
│   ├── /app
│   │   ├── /api            # Serverless Functions (Auth, Sync, AI, Negotiation, Campaign)
│   │   ├── /page.tsx       # Main Entry Point
│   ├── /components
│   │   ├── /broker         # Domain-Specific Components
│   │   │   ├── /negotiation-simulator.tsx  # New: AI Roleplay
│   │   │   ├── /pipeline-campaign-manager.tsx # New: Bulk Outreach
│   │   │   ├── /relationship-timeline.tsx  # New: History Viz
│   │   │   ├── /connector-graph.tsx        # New: Network Viz
│   │   │   ├── /meeting-prep-widget.tsx    # New: Context Fab
│   │   │   ├── /ask-my-data-fab.tsx        # New: QA Interface
│   │   ├── /ui             # Reusable Design System (Shadcn/UI)
│   ├── /lib
│   │   ├── /data           # Types & Mock Generators
│   │   ├── /logic          # CORE INTELLIGENCE (Scoring, Parsing)
│   ├── /System             # Architecture Documentation
└── .env.local              # Secrets & Config
```

---

## 🔁 System Flow Patterns

### 1. Negotiation Simulation Flow
Simulates real-world broker-client interactions to improve closing rates.
```mermaid
sequenceDiagram
    participant User as Broker
    participant UI as Negotiation Simulator
    participant API as /api/negotiate-chat
    participant LLM as Groq AI

    User->>UI: Selects Scenario (e.g., "Hard Renewal")
    UI->>API: Initialize Session (Context: Policy Details)
    loop Negotiation Round
        User->>UI: Sends Message/Argument
        UI->>API: POST /api/negotiate-chat
        API->>LLM: Prompt (Role: Client, Tone: Aggressive)
        LLM-->>API: JSON Response (Message, Sentiment, Counter-offer)
        API-->>UI: Updates Chat Interface
    end
    UI->>User: Display Performance Feedback
```

### 2. Campaign Generation & Execution
Automates high-volume renewal outreach with personalized context.
```mermaid
sequenceDiagram
    participant CRM as Renewal Pipeline
    participant Mgr as Campaign Manager
    participant API as /api/generate-campaign-email
    participant Mail as Email Client

    CRM->>Mgr: Select Target List (Policies expiring < 60 days)
    Mgr->>API: Request Bulk Generation
    loop For Each Policy
        API->>API: Synthesize Brief (Claims, Prem, Tenure)
        API->>LLM: Generate Personalized Email
    end
    API-->>Mgr: Return Draft Batch
    Mgr->>User: Review Drafts
    User->>Mail: Approve & Send
```

### 3. Relationship & Meeting Intelligence
Aggregates dispersed signals into a cohesive client view.
```mermaid
graph LR
    Log[Email Logs] --> |Sentiment Analysis| Time[Relationship Timeline]
    Cal[Calendar Events] --> |Frequency| Graph[Connector Graph]
    Time & Graph --> |Context| Prep[Meeting Prep Widget]
    Prep --> |Briefing| User[Broker]
```

---

## 🛠️ Setup Instructions

### Prerequisites
*   Node.js v18.17+
*   Google Cloud Console Project (for Calendar/Gmail)
*   Ethereum Wallet (MetaMask) or Sepolia RPC
*   **Groq API Key** (Required for Negotiation & Campaign AI)

### Quick Start
1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Environment Configuration**:
    Create `.env.local` with the following:
    ```env
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    NEXT_PUBLIC_GROQ_API_KEY=... # Critical for New Features
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

---

## 🔒 Security Notes

1.  **Data Sovereignty**: The core prioritization logic runs **Client-Side**. For P1 (CSV mode), customer data never leaves the browser memory.
2.  **AI Privacy**: Prompt headers for Negotiation and Campaign generation are scrubbed of PII where possible; only necessary context (Draft Premium, Policy Type) is sent to the LLM.
3.  **Blockchain Security**: State mutations require cryptographic signatures.

---

*Document Version: 2.0.0 | Enhancement Update*
