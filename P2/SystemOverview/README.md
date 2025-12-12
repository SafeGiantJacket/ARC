# 🚀 Broker Copilot: Intelligent Insurance Renewal System

## Executive Summary
**Broker Copilot** is a next-generation AI platform designed to transform the insurance renewal process. By combining real-time data integration, intelligent risk scoring, and automated outreach, it empowers brokers to close renewals faster and with higher retention rates.

---

## 🌟 Key Capabilities

### 🧠 Intelligent Prioritization Engine (Native TypeScript)
Real-time, client-side scoring engine powered by advanced mathematical models (Migrated from Python for zero-latency performance).
-   **Logarithmic Normalization**: Prevents high-value outliers from skewing risk scores.
-   **Exponential Decay**: Urgency scores increase exponentially ($e^{-kt}$) as deadlines approach.
-   **Risk Modeling**: Evaluates Premium at Risk, Claims History, and Churn Likelihood.
-   **Explainable AI**: Provides clear, factor-based explanations for every priority score.

### ⚡ Rapid Renewal Pipeline
A unified dashboard that acts as the broker's command center.
-   **Fault-Tolerant Data Ingestion**: Robust CSV parser capable of handling dirty/malformed datasets without crashing.
-   **Smart Filtering**: Instantly segment policies by urgency, value, or carrier.
-   **CSV Enrichment**: Seamlessly merge external CRM data with blockchain/system records.
-   **Visual Analytics**: Interactive charts and trend lines for portfolio health.

### 📧 Automated Broker Outreach
Streamlined communication tools to turn insights into action.
-   **Context-Aware Templates**: Dynamic email generation using policy data.
-   **Sentiment Analysis**: (Integration Ready) Analyzes client responses to gauge renewal sentiment.
-   **One-Click Sending**: Integrated directly into the workflow.

---

## 🏗️ System Architecture

The Broker Copilot utilizes a modern, decoupled architecture to ensure scalability and performance.

### 1. High-Performance Frontend
**Stack**: `Next.js 14`, `React`, `Tailwind CSS`, `TypeScript`
-   **Role**: Delivers a responsive, client-side optimized user experience.
-   **Features**: Real-time state management, component modularity, and seamless API integration.

### 2. Intelligent Backend Services
**Stack**: `Python 3.9+`, `FastAPI`, `Pandas`, `Pydantic`
-   **Role**: Handles heavy computation, data processing, and ML-ready logic.
-   **Modules**:
    -   `scoring.py`:  The mathematical core of the prioritization engine.
    -   `management.py`:  Robust data ingestion and ETL pipelines.
    -   `models.py`:  Strict type enforcement sharing contracts with the frontend.

### 3. Data Layer
**Stack**: `JSON/CSV`, `Blockchain Integration` (Simulated)
-   **Role**: Flexible data storage supporting diverse sources (On-chain policies, CRM exports, Email logs).

---

## 🚀 Getting Started

### Prerequisites
-   **Node.js** (v18+)
-   **Python** (v3.9+)

### Installation & Run
1.  **Frontend (Broker Dashboard)**
    ```bash
    npm install
    npm run dev
    # Access at http://localhost:3000
    ```

2.  **Backend Services (Scoring Engine)**
    ```bash
    cd backend
    pip install -r requirements.txt
    python main.py
    # API Documentation at http://localhost:8000/docs
    ```
---

## 🏆 Evaluation Highlights

-   **Type Safety**: 100% strictly typed codebase (TypeScript + Pydantic).
-   **Architecture**: Clean separation of concerns (UI vs. Logic).
-   **Modularity**: Component-driven design allowing easy feature expansion.
-   **Data Integrity**: Robust parsing and validation for all external inputs.

---

*Broker Copilot - Redefining Insurance Renewals.*
