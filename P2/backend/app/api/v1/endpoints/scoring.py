from fastapi import APIRouter, HTTPException, UploadFile, File, Body
from typing import List, Optional
from app.models.domain import Policy, RenewalPipelineItem, PriorityWeights, CSVRenewalData, PriorityFactors
from app.services.scoring import ScoringService
from app.services.ingest import IngestionService

router = APIRouter()

@router.post("/calculate", response_model=PriorityFactors)
async def calculate_score(
    policy: Policy, 
    all_policies: List[Policy], 
    csv_data: Optional[CSVRenewalData] = None
):
    """
    Calculate priority factors for a single policy using the advanced scoring engine.
    """
    try:
        factors = ScoringService.calculate_priority_factors(policy, all_policies, csv_data)
        return factors
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pipeline", response_model=List[RenewalPipelineItem])
async def build_pipeline(
    policies: List[Policy], 
    csv_content: Optional[str] = Body(None),
    weights: Optional[PriorityWeights] = None
):
    """
    Build a full prioritized renewal pipeline.
    """
    try:
        # Parse CSV if provided
        csv_map = {}
        if csv_content:
            data = IngestionService.parse_csv_content(csv_content)
            csv_map = {item.policyHash: item for item in data}

        pipeline = []
        for policy in policies:
            # Skip inactive policies
            if policy.status != 1: continue

            csv_data = csv_map.get(policy.policyHash)
            factors = ScoringService.calculate_priority_factors(policy, policies, csv_data)
            
            # Use provided weights or defaults
            final_score = ScoringService.calculate_total_score(factors, weights) if weights else ScoringService.calculate_total_score(factors)
            
            days = ScoringService.calculate_days_until_expiry(policy)
            
            item = RenewalPipelineItem(
                policy=policy,
                daysUntilExpiry=days,
                priorityScore=final_score,
                urgencyLevel=ScoringService.get_urgency_level(days),
                factors=factors,
                source=None # Simplified for API response
            )
            pipeline.append(item)
            
        # Sort by score descending
        pipeline.sort(key=lambda x: x.priorityScore, reverse=True)
        return pipeline

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest/csv", response_model=List[CSVRenewalData])
async def parse_csv(file: UploadFile = File(...)):
    """
    Robust CSV parsing endpoint.
    """
    try:
        content = await file.read()
        return IngestionService.parse_csv_content(content.decode('utf-8'))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")
