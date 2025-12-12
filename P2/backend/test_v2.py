import sys
import os
import asyncio
# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.scoring import ScoringService
from app.services.ingest import IngestionService
from app.models.domain import Policy

def test_v2_logic():
    print("Testing Production-Grade Services...")
    
    # 1. Test Advanced Scoring (Exponential Decay)
    p1 = Policy(
        policyHash="test_1", policyName="Test Policy", policyType="GL",
        coverageAmount=1000000, premium=5000, startTime=1700000000,
        duration=31536000, renewalCount=1, status=1, customer="Corp A"
    )
    
    # Simulate 30 days to expiry
    # logic: if days=30, score should be high due to decay calculation
    # For now we rely on the implementation math.
    days = ScoringService.calculate_days_until_expiry(p1)
    print(f"Days to expiry: {days}")
    
    time_score = ScoringService.calculate_time_score(30)
    print(f"Urgency Score (30 days left): {time_score} (Expected > 60)")
    
    # 2. Test Robust CSV Ingestion
    bad_csv = """
    Policy Hash, Claims Count, Bad Column
    hash_123, 5, junk
    hash_456, not_a_number, junk
    """
    results = IngestionService.parse_csv_content(bad_csv)
    print(f"Parsed {len(results)} valid records from 'dirty' CSV")
    
    if len(results) > 0:
        print(f"Record 1 Claims: {results[0].claimsCount}")
        
    print("Verification Complete.")

if __name__ == "__main__":
    test_v2_logic()
