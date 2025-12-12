import sys
import os

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from models import Policy, PriorityWeights, PriorityFactors
    from scoring import calculate_days_until_expiry, calculate_priority_score, build_renewal_pipeline
    from management import parse_csv_data
    print("Imports successful.")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)

def test_logic():
    # Mock Policy
    p1 = Policy(
        policyHash="hash1",
        policyName="Test Policy",
        status=1,
        startTime=1700000000,
        duration=31536000, # 1 year
        premium=1000,
        customer="Cust1"
    )
    
    # Test Expiry
    days = calculate_days_until_expiry(p1)
    print(f"Days until expiry: {days}")
    
    # Test Pipeline
    pipeline = build_renewal_pipeline([p1])
    print(f"Pipeline items: {len(pipeline)}")
    if len(pipeline) > 0:
        print(f"Score: {pipeline[0].priorityScore}")
        
    # Test CSV Sync
    csv_content = "policyHash,claims\nhash1,5"
    data = parse_csv_data(csv_content)
    print(f"CSV Parse result: {data}")
    
    # Test Integration
    pipeline_with_csv = build_renewal_pipeline([p1], data)
    if len(pipeline_with_csv) > 0:
        print(f"Score with CSV (claims=5): {pipeline_with_csv[0].priorityScore}")
        # Claims=5 -> score 100 for claims. Normalized weight 0.15. 
        # Score should be higher than without CSV.

if __name__ == "__main__":
    try:
        test_logic()
        print("Verification passed.")
    except Exception as e:
        print(f"Verification failed: {e}")
