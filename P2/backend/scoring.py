import time
import math
from datetime import datetime
from typing import List, Dict, Optional
from models import Policy, PriorityFactors, PriorityWeights, CSVRenewalData, RenewalPipelineItem, DataSource, ScoreBreakdown

# Time windows
TIME_WINDOWS = [
    {"days": 180, "label": "6 Months", "color": "text-blue-400"},
    {"days": 90, "label": "3 Months", "color": "text-yellow-400"},
    {"days": 30, "label": "30 Days", "color": "text-orange-400"},
    {"days": 7, "label": "7 Days", "color": "text-red-400"},
]

DEFAULT_WEIGHTS = PriorityWeights(
    premiumAtRisk=0.3,
    timeToExpiry=0.25,
    claimsHistory=0.15,
    carrierResponsiveness=0.1,
    churnLikelihood=0.2,
)

def calculate_days_until_expiry(policy: Policy) -> int:
    if policy.status == 0: return 999  # Pending
    if policy.status == 2: return 0    # Expired

    expiry_time = int(policy.startTime) + int(policy.duration)
    now = int(time.time())
    days_remaining = math.ceil((expiry_time - now) / (24 * 60 * 60))
    return max(0, days_remaining)

def calculate_premium_score(policy: Policy, all_policies: List[Policy]) -> int:
    # TS: formatEther(policy.premium) -> we assume policy.premium is already normalized or we use raw val
    # The TS code used formatEther (1e18), assuming input is wei. 
    # Let's assume the Python models will receive int/float values. 
    # If they receive huge ints (wei), the ratio calculation remains valid.
    
    premium = float(policy.premium)
    all_premiums = [float(p.premium) for p in all_policies]
    max_premium = max(max(all_premiums, default=1), 1)
    
    return min(100, int((premium / max_premium) * 100))

def calculate_time_score(days_until_expiry: int) -> int:
    if days_until_expiry >= 999: return 5
    if days_until_expiry <= 0: return 100
    if days_until_expiry <= 7: return 95
    if days_until_expiry <= 14: return 85
    if days_until_expiry <= 30: return 70
    if days_until_expiry <= 60: return 50
    if days_until_expiry <= 90: return 35
    if days_until_expiry <= 180: return 20
    return 10

def get_urgency_level(days_until_expiry: int) -> str:
    if days_until_expiry >= 999: return "low"
    if days_until_expiry <= 0: return "critical"
    if days_until_expiry <= 7: return "critical"
    if days_until_expiry <= 30: return "high"
    if days_until_expiry <= 90: return "medium"
    return "low"

def calculate_priority_factors(policy: Policy, all_policies: List[Policy], csv_data: Optional[CSVRenewalData] = None) -> PriorityFactors:
    days_until_expiry = calculate_days_until_expiry(policy)
    
    claims_score = 30
    if csv_data and csv_data.claimsCount is not None:
        claims_score = min(100, csv_data.claimsCount * 20)
        
    rating_score = 50
    if csv_data and csv_data.carrierRating is not None:
        rating_score = round((5 - csv_data.carrierRating) * 25)
    
    churn_score = 40
    if csv_data and csv_data.churnRisk is not None:
        churn_score = csv_data.churnRisk

    return PriorityFactors(
        premiumAtRisk=calculate_premium_score(policy, all_policies),
        timeToExpiry=calculate_time_score(days_until_expiry),
        claimsHistory=claims_score,
        carrierResponsiveness=rating_score,
        churnLikelihood=churn_score
    )

def calculate_priority_score(factors: PriorityFactors, weights: PriorityWeights = DEFAULT_WEIGHTS) -> int:
    weights_sum = (weights.premiumAtRisk + weights.timeToExpiry + 
                   weights.claimsHistory + weights.carrierResponsiveness + 
                   weights.churnLikelihood)
    
    if weights_sum == 0:
        return 0
        
    norm_premium = weights.premiumAtRisk / weights_sum
    norm_time = weights.timeToExpiry / weights_sum
    norm_claims = weights.claimsHistory / weights_sum
    norm_rating = weights.carrierResponsiveness / weights_sum
    norm_churn = weights.churnLikelihood / weights_sum
    
    score = (
        factors.premiumAtRisk * norm_premium +
        factors.timeToExpiry * norm_time +
        factors.claimsHistory * norm_claims +
        factors.carrierResponsiveness * norm_rating +
        factors.churnLikelihood * norm_churn
    )
    
    return round(max(0, min(100, score)))

def build_renewal_pipeline(
    policies: List[Policy], 
    csv_data_map: Dict[str, CSVRenewalData] = {}, 
    time_window_days: int = 180, 
    weights: PriorityWeights = DEFAULT_WEIGHTS
) -> List[RenewalPipelineItem]:
    
    pipeline = []
    
    for policy in policies:
        if policy.status != 1: continue # Active only ?? TS says status!==1 continue, wait. 
        # TS: if (policy.status !== 1) continue
        # Let's verify TS logic. The file trace said:
        # 147:   for (const policy of policies) {
        # 148:     if (policy.status !== 1) continue
        # This implies we ONLY process policies with status 1.
        
        days_until_expiry = calculate_days_until_expiry(policy)
        
        if days_until_expiry > time_window_days and days_until_expiry != 0:
            continue
            
        csv_data = csv_data_map.get(policy.policyHash)
        factors = calculate_priority_factors(policy, policies, csv_data)
        priority_score = calculate_priority_score(factors, weights)
        
        source = None
        if csv_data:
            source = DataSource(
                type="csv",
                id=csv_data.crmId or policy.policyHash,
                lastSync=datetime.now()
            )
        else:
            source = DataSource(
                type="blockchain",
                id=policy.policyHash
            )
            
        item = RenewalPipelineItem(
            policy=policy,
            daysUntilExpiry=days_until_expiry,
            priorityScore=priority_score,
            urgencyLevel=get_urgency_level(days_until_expiry),
            factors=factors,
            source=source
        )
        pipeline.append(item)
        
    # Sort by priority score desc
    pipeline.sort(key=lambda x: x.priorityScore, reverse=True)
    return pipeline
