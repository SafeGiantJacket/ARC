from typing import Dict, List, Optional
from models import CSVRenewalData

def parse_csv_data(csv_content: str) -> Dict[str, CSVRenewalData]:
    """
    Parse CSV data for renewal enrichment
    Expected columns: policyHash, customerName, email, claims, carrierRating, churnRisk...
    """
    result_map: Dict[str, CSVRenewalData] = {}
    
    lines = csv_content.strip().split("\n")
    if len(lines) < 2:
        return result_map
        
    headers = [h.strip().lower() for h in lines[0].split(",")]
    
    for i in range(1, len(lines)):
        line = lines[i].strip()
        if not line: continue
        
        values = [v.strip() for v in line.split(",")]
        # Pad values if line is short
        while len(values) < len(headers):
            values.append("")
            
        record_data = {}
        
        # Temporary holding vars to construct the Pydantic model later
        policy_hash = ""
        
        for idx, header in enumerate(headers):
            if idx >= len(values): break
            value = values[idx]
            if not value: continue
            
            if header in ["policyhash", "policy_hash", "hash"]:
                policy_hash = value
            elif header in ["customername", "customer_name", "name"]:
                record_data["customerName"] = value
            elif header in ["email", "customeremail"]:
                record_data["customerEmail"] = value
            elif header in ["claims", "claimscount", "claims_count", "claims_number"]:
                try: record_data["claimsCount"] = int(value)
                except: record_data["claimsCount"] = 0
            elif header in ["carrierrating", "carrier_rating", "rating"]:
                try: record_data["carrierRating"] = float(value)
                except: record_data["carrierRating"] = 3.0
            elif header in ["churnrisk", "churn_risk", "churn"]:
                try: record_data["churnRisk"] = int(value)
                except: record_data["churnRisk"] = 40
            elif header in ["crmid", "crm_id"]:
                record_data["crmId"] = value
            elif header in ["calendareventid", "calendar_id", "eventid"]:
                record_data["calendarEventId"] = value
            elif header in ["meetingnotes", "meeting_notes"]:
                record_data["meetingNotes"] = value
            elif header in ["lastcontactdate", "last_contact_date"]:
                record_data["lastContactDate"] = value
            elif header in ["carrierstatus", "carrier_status"]:
                record_data["carrierStatus"] = value
            elif header in ["recentemails", "recent_emails"]:
                record_data["recentEmails"] = value

        if policy_hash:
            record_data["policyHash"] = policy_hash
            result_map[policy_hash] = CSVRenewalData(**record_data)
            
    return result_map
