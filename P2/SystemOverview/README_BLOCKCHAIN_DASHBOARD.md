# Blockchain-Based Insurance Policy Platform

## Overview

A modern, structured dashboard for managing insurance policies on the Sepolia testnet with integrated AI features (Groq), real-time activity logs, and seamless broker-customer interactions.

## Architecture

### Key Components

#### 1. **Main Dashboard Entry** (`app/page.tsx`)
- Role selection (Broker/Customer)
- Data mode toggle (CSV/Blockchain)
- Wallet connection flow
- Session management

#### 2. **Broker Dashboard** (`components/broker/broker-dashboard.tsx`)
**Primary Features:**
- **Overview Tab**: Quick statistics (Total, Active, Pending, Expired policies)
- **Create Policy Tab**: Form to create new policies on blockchain
- **Calendar & AI Scheduler**: Integrated scheduling with AI suggestions
- **Activity Log**: Real-time Sepolia testnet events
- **Policy Upload**: Bulk upload business policy templates
- **CSV Integration**: Upload placements, emails, calendar data

**Data Sources:**
- Blockchain (live Sepolia testnet)
- CSV files (for testing/importing)
- Session storage (temporary data)

#### 3. **Customer/User Dashboard** (`components/user/user-dashboard.tsx`)
**Primary Features:**
- **My Policies Tab**: View all policies (with filters: all/pending/active/expired)
- **Pending Signatures Tab**: Accept & sign pending policies
- **Policy Details**: Full information with renewable actions
- **Real-time Sync**: Refreshes from blockchain

#### 4. **Accept Policy Component** (`components/user/accept-policy-section.tsx`)
- Displays policies awaiting customer signature
- Shows detailed policy information
- "Accept & Sign" button triggers blockchain transaction
- Expandable details for full policy information

#### 5. **Create Policy Component** (`components/broker/broker-create-policy.tsx`)
- Form with fields: name, type, coverage, premium, duration, customer address, notes
- Validates inputs before blockchain submission
- Real-time error feedback
- Success confirmation with transaction hash

#### 6. **Activity Log** 
- Fetches real-time events from Sepolia testnet
- Event types: PolicyCreated, PolicySigned, PolicyRenewed, PolicyExpired
- Displays with timestamps and transaction hashes
- Auto-refresh capability

### Supporting Components

- **Email Outreach**: Manual tracking of customer interactions
- **Q&A Module**: Groq AI chatbot for policy queries
- **Calendar & Notes**: Integrated scheduling with AI suggestions
- **Renewal Pipeline**: CRM-style view of all placements
- **Email Summary**: Sentiment analysis and communication tracking

## Data Flow

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    BROKER ACTIONS                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Create Policy (Form)                                │
│     ↓                                                    │
│  2. Submit to Smart Contract                           │
│     ↓                                                    │
│  3. Blockchain Event: PolicyCreated                    │
│     ↓                                                    │
│  4. Activity Log Updated                               │
│                                                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  CUSTOMER NOTIFICATIONS                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Policy appears in "Pending Signatures" tab          │
│  2. Shows policy details & premium amount              │
│  3. "Accept & Sign" button enabled                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   CUSTOMER ACTIONS                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Review Policy Details                              │
│  2. Click "Accept & Sign"                              │
│  3. Blockchain Transaction (signPolicy)                │
│  4. Policy Status Changes: 0 (pending) → 1 (active)   │
│                                                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    SYSTEM UPDATES                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Activity Log: PolicySigned event                   │
│  2. Broker Pipeline: Shows "Active" status             │
│  3. Customer Dashboard: Policy moves to "Active" tab   │
│                                                           │
└─────────────────────────────────────────────────────────┘
\`\`\`

## Component Integration Map

\`\`\`
BROKER DASHBOARD
├── Tab Navigation (sticky header)
│   ├── Overview (stats cards)
│   ├── Create Policy (form component)
│   ├── Calendar & AI (scheduler integration)
│   ├── Activity Log (Sepolia events)
│   ├── Upload Policies (CSV importer)
│   └── CSV Data (upload section)
│
├── Import Components:
│   ├── BrokerCreatePolicy
│   ├── BrokerCalendarWithScheduler
│   ├── RenewalPipeline
│   ├── EmailOutreach
│   ├── QAChatbot
│   └── PolicyUploader

CUSTOMER DASHBOARD
├── Tab Navigation
│   ├── My Policies (overview with filters)
│   └── Pending Signatures (accept section)
│
├── Import Components:
│   └── AcceptPolicySection (new)
│
└── Integration:
    └── Syncs with blockchain after signature
\`\`\`

## Key Features

### 1. Transparent Blockchain Functions

All blockchain operations are visible and auditable:
- **Create Policy** → Transaction recorded on Sepolia
- **Accept Policy** → Customer signature event logged
- **Renew Policy** → Renewal event with metadata
- **Activity Log** → Real-time event streaming

### 2. Intelligent Routing

- **No Active Policies** → Redirect to "Create Policy" tab
- **Pending Policies** → Show "Accept & Sign" prompt
- **Active Policies** → Display in pipeline with actions
- **Expired Policies** → Show renewal options

### 3. Data Persistence

- **Blockchain**: Permanent smart contract storage (Sepolia)
- **Session Storage**: Temporary CSV data during session
- **Component State**: React state for UI responsiveness

### 4. AI Integration

- **Q&A Module**: Groq AI answers questions about policies
- **Calendar AI**: Smart scheduling based on renewal urgency
- **Sentiment Analysis**: Email communication insights
- **Negotiation Simulator**: Roleplay complex renewals with specific client personas
- **Campaign Manager**: Auto-generate personalized outreach for segregated pipelines

## Workflow Examples

### Workflow 1: Create & Sign Policy

\`\`\`
BROKER
  ↓ Opens "Create Policy" tab
  ↓ Fills form (name, premium, customer address, etc.)
  ↓ Clicks "Create Policy"
  ↓ Wallet signs transaction
  ↓ Smart contract creates policy (status=0, pending)
  ↓ Activity Log shows: "PolicyCreated" event

CUSTOMER
  ↓ Opens "Pending Signatures" tab
  ↓ Sees new policy with details
  ↓ Reviews coverage amount and premium
  ↓ Clicks "Accept & Sign"
  ↓ Wallet signs transaction
  ↓ Smart contract updates policy (status=1, active)
  ↓ Activity Log shows: "PolicySigned" event
  ↓ Policy moves to "My Policies" → "Active" filter
\`\`\`

### Workflow 2: Renew Expiring Policy

\`\`\`
CUSTOMER
  ↓ Sees policy in "Expired" filter
  ↓ Enters renewal duration (e.g., 30 days)
  ↓ Clicks "Renew"
  ↓ Wallet signs renewal transaction
  ↓ Smart contract increments renewal count
  ↓ Policy extends expiry date
  ↓ Activity Log shows: "PolicyRenewed" event
\`\`\`

## API/Function Reference

### Broker Functions

\`\`\`typescript
// Create a new policy
await contract.createPolicy(
  customerAddress,
  "Policy Name",
  "Coverage Type",
  coverageAmount,  // wei
  premium,         // wei
  durationInDays * 24 * 60 * 60,
  "Optional notes"
)

// Get all policies
const hashes = await contract.getAllPolicies()

// Get specific policy
const policy = await contract.getPolicy(policyHash)
\`\`\`

### Customer Functions

\`\`\`typescript
// Sign pending policy
await contract.signPolicy(policyHash)

// Get my policies
const myPolicies = await contract.getActivePolicies(userAddress)

// Renew expired policy
await contract.renew(policyHash, renewalDays)
\`\`\`

### Event Monitoring

\`\`\`typescript
// Listen for policy events
const filter = contract.filters.PolicyCreated()
const events = await contract.queryFilter(filter)

// Event types:
- PolicyCreated(policyHash, customer)
- PolicySigned(policyHash, customer)
- PolicyRenewed(policyHash, renewalCount)
- PolicyExpired(policyHash)
\`\`\`

## UI/UX Highlights

### Broker Experience

1. **Quick Start**: "Create First Policy" prompt when no policies exist
2. **Activity Dashboard**: See all interactions in real-time
3. **Multi-section Navigation**: Tabs for organized feature access
4. **Pipeline View**: CRM-style management of placements
5. **CSV Import**: Easy data upload with validation

### Customer Experience

1. **Clear Notifications**: Pending policies highlighted separately
2. **Detailed Information**: Full policy info before signing
3. **One-Click Accept**: Simple "Accept & Sign" process
4. **Status Tracking**: See policy lifecycle (pending → active → expired)
5. **Renewal Management**: Easy renewal with duration input

## Testing Checklist

- [ ] Broker can connect wallet
- [ ] Broker can create policy on Sepolia
- [ ] Customer receives policy in "Pending Signatures"
- [ ] Customer can sign policy
- [ ] Activity Log shows all events
- [ ] Policy status updates correctly
- [ ] Renewal functionality works
- [ ] AI Q&A responds to queries
- [ ] Calendar scheduling works
- [ ] Email sentimentanalysis displays
- [ ] CSV import processes data
- [ ] Blockchain events sync in real-time

## Environment Setup

### Required

- MetaMask wallet connected to Sepolia testnet
- Smart contract deployed on Sepolia
- Groq API key for Q&A feature
- Environment variables configured

### Sepolia Testnet Details

- Network ID: 11155111
- RPC: https://sepolia.infura.io/v3/{PROJECT_ID}
- Contract Address: Set in environment variables
- Status: Live testnet (no real ETH required, use faucet)

## Future Enhancements

- [ ] Policy marketplace
- [ ] Multi-signature broker agreements
- [ ] Automated renewal reminders
- [ ] Advanced analytics dashboard
- [ ] Integration with insurance carriers
- [ ] Automated claims processing
- [ ] Policy bundling
- [ ] Commission tracking & payouts
