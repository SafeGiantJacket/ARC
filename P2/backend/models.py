from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any
from datetime import datetime

class Policy(BaseModel):
    policyHash: str = ""
    policyName: str = ""
    policyType: str = ""
    coverageAmount: int = 0
    premium: int = 0
    startTime: int = 0
    duration: int = 0
    renewalCount: int = 0
    notes: str = ""
    status: int = 0
    customer: str = ""

class InsurancePlacement(BaseModel):
    client: str
    placementClientLocalId: str
    placementName: str
    coverage: str
    productLine: str
    carrierGroup: str
    placementCreatedDateTime: str
    placementCreatedBy: str
    placementCreatedById: str
    responseReceivedDate: str
    placementSpecialist: str
    placementRenewingStatus: str
    placementStatus: str
    declinationReason: str
    placementId: str
    placementEffectiveDate: str
    placementExpiryDate: str
    incumbentIndicator: str
    participationStatusCode: str
    placementClientSegmentCode: str
    placementRenewingStatusCode: str
    limit: float
    coveragePremiumAmount: float
    triaPremium: float
    totalPremium: float
    commissionPercent: float
    commissionAmount: float
    participationPercentage: float
    carrierGroupLocalId: str
    productionCode: str
    submissionSentDate: str
    programProductLocalCodeText: str
    approachNonAdmittedMarketIndicator: str
    carrierIntegration: str
    # Computed fields
    daysUntilExpiry: Optional[int] = None
    priorityScore: Optional[int] = None

class PriorityFactors(BaseModel):
    premiumAtRisk: int
    timeToExpiry: int
    claimsHistory: int
    carrierResponsiveness: int
    churnLikelihood: int

class PriorityWeights(BaseModel):
    premiumAtRisk: float
    timeToExpiry: float
    claimsHistory: float
    carrierResponsiveness: float
    churnLikelihood: float

class CSVRenewalData(BaseModel):
    policyHash: str
    customerName: Optional[str] = None
    customerEmail: Optional[str] = None
    claimsCount: Optional[int] = None
    carrierRating: Optional[float] = None
    churnRisk: Optional[int] = None
    crmId: Optional[str] = None
    calendarEventId: Optional[str] = None
    meetingNotes: Optional[str] = None
    lastContactDate: Optional[str] = None
    carrierStatus: Optional[str] = None
    recentEmails: Optional[str] = None

class DataSource(BaseModel):
    type: str # "blockchain" | "crm" | "csv" | "email" | "calendar"
    id: str
    lastSync: Optional[datetime] = None

class ScoreBreakdownFactor(BaseModel):
    name: str
    score: int
    maxScore: int
    description: str
    impact: str # "positive" | "negative" | "neutral"

class ScoreBreakdown(BaseModel):
    total: int
    factors: List[ScoreBreakdownFactor]

class RenewalPipelineItem(BaseModel):
    policy: Optional[Policy] = None
    placement: Optional[InsurancePlacement] = None
    daysUntilExpiry: int
    priorityScore: int
    urgencyLevel: str # "critical" | "high" | "medium" | "low"
    factors: PriorityFactors
    source: Optional[DataSource] = None
    scoreBreakdown: Optional[ScoreBreakdown] = None
