import time
import random
from typing import Dict, Any


class ExternalMockGateway:
    """
    Mock gateway adapters for Indian Regulatory & Banking Inter-Switch APIs:
    1. I4C CFCFRMS (National Cybercrime Reporting Portal / 1930 Lien Protocol)
    2. DoT Chakshu (Department of Telecommunications Fraud Intelligence Platform)
    3. Core UPI Bank Switch Settlement Hook
    """

    def dispatch_i4c_lien(
        self,
        transaction_id: str,
        amount_inr: float,
        beneficiary_vpa_hash: str,
        ifsc: str,
    ) -> Dict[str, Any]:
        """
        Simulates automated beacon dispatch under Section 91 CrPC to freeze downstream mule liquidity.
        """
        ack_id = f"I4C-1930-{int(time.time())}-{random.randint(1000, 9999)}"
        return {
            "status": "LIEN_PLACED_ACKNOWLEDGEMENT",
            "acknowledgement_id": ack_id,
            "target_system": "I4C_CFCFRMS_INTERBANK_GATEWAY",
            "transaction_id": transaction_id,
            "beneficiary_vpa_hash": beneficiary_vpa_hash,
            "amount_frozen_inr": amount_inr,
            "ifsc": ifsc,
            "statutory_mandate": "Section 91 CrPC Emergency Interbank Halt",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    def query_dot_chakshu_tier(self, phone_hash: str) -> Dict[str, Any]:
        """
        Simulates query to DoT Chakshu platform for SIM swap / reported telecom fraud history.
        """
        return {
            "phone_hash": phone_hash,
            "carrier_risk_tier": "TIER_1_NOMINAL",
            "sim_swap_last_48h": False,
            "spam_call_report_count": 0,
        }


external_gateway = ExternalMockGateway()
