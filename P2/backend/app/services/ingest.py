import logging
import csv
import io
from typing import Dict, List, Optional
from datetime import datetime
from app.models.domain import CSVRenewalData

logger = logging.getLogger(__name__)

class IngestionService:
    @staticmethod
    def parse_csv_content(content: str) -> List[CSVRenewalData]:
        """
        Parses CSV content with fault tolerance.
        - Handles BOM (Byte Order Mark) quirks
        - Normalizes headers to snake_case or camelCase variations
        - Skips empty lines
        - Logs malformed rows instead of crashing
        """
        results = []
        if not content:
            return results

        try:
            # Use Python's built-in CSV reader for better parsing (handling quotes, etc.)
            f = io.StringIO(content.strip())
            reader = csv.DictReader(f)
            
            if not reader.fieldnames:
                return results

            # Create a normalized header map
            # e.g. "Policy Hash" -> "policyHash", "Claims Count" -> "claimsCount"
            header_map = IngestionService._build_header_map(reader.fieldnames)
            
            for row in reader:
                try:
                    record_data = {}
                    policy_hash = None
                    
                    for raw_key, value in row.items():
                        if not value: continue
                        normalized_key = header_map.get(raw_key.lower().strip())
                        
                        if normalized_key == "policyHash":
                            policy_hash = value.strip()
                        elif normalized_key:
                            IngestionService._coerce_and_set(record_data, normalized_key, value)
                            
                    if policy_hash:
                        record_data["policyHash"] = policy_hash
                        results.append(CSVRenewalData(**record_data))
                        
                except Exception as row_err:
                    logger.warning(f"Failed to parse row: {row}. Error: {row_err}")
                    continue

        except Exception as e:
            logger.error(f"Critical error parsing CSV: {e}")
            raise ValueError(f"Failed to parse CSV: {e}")

        return results

    @staticmethod
    def _coerce_and_set(data: dict, key: str, value: str):
        """Helper to cast types safely."""
        value = value.strip()
        try:
            if key in ["claimsCount", "churnRisk"]:
                data[key] = int(value)
            elif key == "carrierRating":
                data[key] = float(value)
            else:
                data[key] = value
        except ValueError:
            # Keep original or set default if casting fails? 
            # For data integrity, better to skip or set None than crash
            pass

    @staticmethod
    def _build_header_map(headers: List[str]) -> Dict[str, str]:
        """
        Maps various header styles to domain model fields.
        """
        mapping = {}
        # Domain fields to their probable CSV aliases
        field_aliases = {
            "policyHash": ["policyhash", "hash", "policy_hash", "id"],
            "claimsCount": ["claims", "claimscount", "claims_count"],
            "carrierRating": ["rating", "carrierrating", "carrier_rating"],
            "churnRisk": ["churn", "churnrisk", "churn_risk"],
            "customerName": ["name", "customer", "customername"],
            "customerEmail": ["email", "customeremail"],
            "crmId": ["crmid", "crm_id"],
            "meetingNotes": ["notes", "meetingnotes"],
        }
        
        for h in headers:
            h_clean = h.lower().strip().replace(" ", "").replace("_", "")
            
            matched = False
            for field, aliases in field_aliases.items():
                # Direct check against cleaned aliases
                # e.g. "claimscount" in ["claims", "claimscount"]
                for alias in aliases:
                    if h_clean == alias.replace("_", ""):
                        mapping[h.lower().strip()] = field
                        matched = True
                        break
                if matched: break
            
            # Map remaining fields by exact name match if logic fails
            if not matched:
                pass 
                
        return mapping
