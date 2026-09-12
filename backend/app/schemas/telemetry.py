from typing import Optional
from pydantic import BaseModel, Field


class PayerInfo(BaseModel):
    account_id: str = Field(..., description="Internal core banking account ID")
    vpa: str = Field(..., description="Virtual Payment Address of payer")
    phone: str = Field(..., description="E.164 phone number of payer")
    device_id: str = Field(..., description="Unique hardware/device token")


class PayeeInfo(BaseModel):
    account_id: str = Field(..., description="Internal beneficiary account ID")
    vpa: str = Field(..., description="Virtual Payment Address of beneficiary")
    ifsc: str = Field(..., description="11-character Indian Financial System Code")


class TelemetryData(BaseModel):
    active_call: bool = Field(False, description="Whether phone call or VoIP was active during checkout")
    call_duration_seconds: int = Field(0, description="Duration in seconds of active call")
    call_ended_seconds_ago: Optional[int] = Field(None, description="Seconds elapsed since call disconnect if call just ended")
    screen_share_active: bool = Field(False, description="Remote desktop or screen projection active flag")
    accessibility_service_enabled: bool = Field(False, description="Potentially untrusted accessibility service hook")
    typing_speed_wpm: float = Field(0.0, description="Keystroke speed on payment screen in words per minute")
    typing_jitter_ms: float = Field(0.0, description="Keystroke interval variance on PIN entry pad")
    is_new_payee_for_payer: bool = Field(False, description="True if payee has zero payment history with payer")
    transactions_in_last_10m: int = Field(0, description="Rolling payment count in the last 10 minutes")


class InterceptRequest(BaseModel):
    transaction_id: str = Field(..., description="Unique payment identifier")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    payer: PayerInfo
    payee: PayeeInfo
    amount_inr: float = Field(..., gt=0, description="Transfer amount in Indian Rupees")
    currency: str = Field("INR", description="Currency code, standard INR")
    telemetry: TelemetryData
