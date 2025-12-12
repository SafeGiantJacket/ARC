import math
import time
import logging
from typing import List, Optional
from datetime import datetime
from app.models.domain import Policy, PriorityFactors, PriorityWeights, CSVRenewalData

logger = logging.getLogger(__name__)

# Constants
SECONDS_PER_DAY = 86400
DEFAULT_WEIGHTS = PriorityWeights(
    premiumAtRisk=0.3,
    timeToExpiry=0.25,
    claimsHistory=0.15,
    carrierResponsiveness=0.1,
    churnLikelihood=0.2,
)

class ScoringService:
    @staticmethod
    def calculate_days_until_expiry(policy: Policy) -> int:
        """
        Robustly calculates days until expiry.
        Handles:
        - Expired policies (returns 0)
        - Pending policies (returns 999)
        - Timezone agnostic calculation (UTC timestamps)
        """
        if policy.status == 0:  # Pending
            return 999
        if policy.status == 2:  # Expired
            return 0

        expiry_time = int(policy.startTime) + int(policy.duration)
        now = int(time.time())
        days_remaining = math.ceil((expiry_time - now) / SECONDS_PER_DAY)
        return max(0, days_remaining)

    @staticmethod
    def calculate_premium_score(policy: Policy, all_policies: List[Policy]) -> int:
        """
        Calculates premium score using Logarithmic Normalization.
        This prevents massive outliers (e.g., one $10M policy) from squashing all other scores to 0.
        """
        try:
            premium = float(policy.premium)
            if premium <= 0: return 0

            # Get all premiums > 0 to avoid log(0)
            valid_premiums = [float(p.premium) for p in all_policies if float(p.premium) > 0]
            if not valid_premiums:
                return 0
            
            # Log transform to handle wide variance in policy values
            log_premium = math.log10(premium)
            max_log_premium = math.log10(max(valid_premiums))
            
            if max_log_premium == 0:
                return 100
            
            # Normalize 0-100 based on log scale
            score = (log_premium / max_log_premium) * 100
            return int(min(100, max(0, score)))
        except Exception as e:
            logger.error(f"Error calculating premium score for {policy.policyHash}: {e}")
            return 0

    @staticmethod
    def calculate_time_score(days_until_expiry: int) -> int:
        """
        Calculates urgency using Exponential Decay.
        Instead of rigid buckets, this increases urgency rapidly as the date approaches.
        Score = 100 * e^(-k * days)
        """
        if days_until_expiry >= 365: return 5
        if days_until_expiry <= 0: return 100
        
        # Determine decay constant k such that 90 days = ~35 score
        # 35 = 100 * e^(-k * 90) -> ln(0.35) = -k * 90 -> k ~= 0.0116
        k = 0.012
        score = 100 * math.exp(-k * days_until_expiry)
        return int(min(100, max(5, score)))

    @staticmethod
    def get_urgency_level(days_until_expiry: int) -> str:
        if days_until_expiry >= 999: return "low"
        if days_until_expiry <= 7: return "critical"
        if days_until_expiry <= 30: return "high"
        if days_until_expiry <= 90: return "medium"
        return "low"

    @staticmethod
    def calculate_priority_factors(
        policy: Policy, 
        all_policies: List[Policy], 
        csv_data: Optional[CSVRenewalData] = None
    ) -> PriorityFactors:
        
        days = ScoringService.calculate_days_until_expiry(policy)
        
        # Robust defaults
        claims_score = 30
        rating_score = 50
        churn_score = 40
        
        if csv_data:
            # Claims: Linear scaling capped at 100 (5 claims = 100)
            if csv_data.claimsCount is not None:
                claims_score = min(100, csv_data.claimsCount * 20)
            
            # Rating: Incorrect ratings handling fixed (1-5 star scale)
            if csv_data.carrierRating is not None:
                # 5 stars = 0 risk (score 0), 1 star = 100 risk (score 100)
                # Formula: (5 - rating) * 25
                rating_score = round(max(0, min(5, (5 - csv_data.carrierRating))) * 25)
                
            if csv_data.churnRisk is not None:
                churn_score = csv_data.churnRisk

        return PriorityFactors(
            premiumAtRisk=ScoringService.calculate_premium_score(policy, all_policies),
            timeToExpiry=ScoringService.calculate_time_score(days),
            claimsHistory=claims_score,
            carrierResponsiveness=rating_score,
            churnLikelihood=churn_score
        )

    @staticmethod
    def calculate_total_score(factors: PriorityFactors, weights: PriorityWeights = DEFAULT_WEIGHTS) -> int:
        """
        Calculates weighted average with validation.
        """
        total_weight = (
            weights.premiumAtRisk + 
            weights.timeToExpiry + 
            weights.claimsHistory + 
            weights.carrierResponsiveness + 
            weights.churnLikelihood
        )
        
        if total_weight <= 0:
            logger.warning("Total weights sum to zero or less. Returning 0 score.")
            return 0
            
        # Weighted Sum
        score = (
            factors.premiumAtRisk * weights.premiumAtRisk +
            factors.timeToExpiry * weights.timeToExpiry +
            factors.claimsHistory * weights.claimsHistory +
            factors.carrierResponsiveness * weights.carrierResponsiveness +
            factors.churnLikelihood * weights.churnLikelihood
        ) / total_weight
        
        return int(round(max(0, min(100, score))))
