# Blockchain-Based Policy Management System

## Architecture Overview

This platform integrates blockchain policy management with AI-powered insights and data management features. The system operates in two modes: **CSV Mode** (for testing) and **Blockchain Mode** (Sepolia Testnet).

## Key Components

### 1. **Broker Dashboard** (`broker-pipeline-dashboard.tsx`)
The main broker interface showcasing:

- **Pipeline View** (Default) - Shows active renewal policies
  - Displays all policies created by the broker
  - Shows customer interactions and renewal status
  - Redirects to "Create Policy" if no active policies exist

- **Create Policy** - Blockchain transaction to create new policies
  - Form fields: Policy Name, Type, Coverage, Premium, Duration, Customer Address, Notes
  - Executes smart contract function to create and store policy on-chain
  - Emits blockchain events

- **Outreach Module** - Manual email/communication logging
  - Add outreach notes and communications
  - Track broker-to-customer interactions
  - Link to specific policies

- **Q&A Feature** - Groq AI-powered insights
  - Query blockchain policies using natural language
  - Analyze policy data with AI
  - Get recommendations based on pipeline status

- **Calendar & AI Scheduler** - Integrated scheduling
  - View and manage calendar events
  - AI-generated smart schedule based on pipeline urgency
  - Sync with policy renewal dates

- **Activity Log** - Real-time Sepolia testnet events
  - Shows all blockchain transactions from the connected wallet
  - Displays PolicyCreated, PolicySigned, PolicyRenewed events
  - Real-time updates from blockchain

### 2. **User Dashboard** (`user-dashboard.tsx`)
Customer interface with sections:

- **Policy Overview** - Stats on total, pending, active, and expired policies
- **Policy List** - All policies with status indicators
- **Accept & Sign Section** - Prominent area for signing pending policies
  - Shows policies waiting for customer signature
  - Displays policy details before signing
  - One-click blockchain signature

### 3. **Policy Management Components**

#### Create Policy (`broker-create-policy.tsx`)
- Broker initiates policy creation
- Forms submission triggers smart contract deployment
- Policy stored with status = 0 (Pending Signature)

#### Accept Policy (`accept-policy-section.tsx`)
- Customers view pending policies
- Sign policies to activate them (status = 1)
- Blockchain transaction confirmation required

#### Policy Uploader (`policy-uploader.tsx`)
- Upload CSV with policy templates
- Load dummy business policies
- Manage policy library

## Blockchain Functions

### Smart Contract Interactions

```solidity
// Creating a policy (Broker)
createPolicy(
  policyName: string,
  policyType: string,
  coverageAmount: uint256,
  premium: uint256,
  duration: uint256,
  customerAddress: address,
  notes: string
)

// Signing a policy (Customer)
signPolicy(policyHash: bytes32)

// Renewing a policy (Customer)
renew(policyHash: bytes32, daysToRenew: uint256)
