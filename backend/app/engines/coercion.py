import math
from typing import Dict, Any, Tuple


class CoercionEngine:
    """
    Evaluates behavioral, device, and interaction telemetry to quantify
    urgent voice call coercion and screen-sharing exploitation under pressure.
    """

    def evaluate(self, telemetry: Dict[str, Any], amount_inr: float) -> Tuple[float, Dict[str, float]]:
        """
        Computes the coercion index in [0, 1] along with feature attribution signals.
        """
        active_call = bool(telemetry.get("active_call", False))
        call_duration = float(telemetry.get("call_duration_seconds", 0))
        call_ended_ago = telemetry.get("call_ended_seconds_ago")
        screen_share = bool(telemetry.get("screen_share_active", False))
        accessibility = bool(telemetry.get("accessibility_service_enabled", False))
        jitter_ms = float(telemetry.get("typing_jitter_ms", 0.0))
        speed_wpm = float(telemetry.get("typing_speed_wpm", 0.0))
        is_new_payee = bool(telemetry.get("is_new_payee_for_payer", False))
        tx_last_10m = int(telemetry.get("transactions_in_last_10m", 0))

        signals: Dict[str, float] = {}
        score = 0.0

        # 1. Voice Call Coercion Evaluation
        if active_call:
            # Active call during checkout is a primary APP coercion indicator
            call_base = 0.40
            # Duration scaling: scammers keep victims on line for 15-45 minutes
            if call_duration > 900:  # > 15 mins
                call_weight = 0.45
            elif call_duration > 300:  # > 5 mins
                call_weight = 0.30
            else:
                call_weight = 0.15
            call_contrib = call_base + call_weight
            signals["prolonged_active_voice_call"] = round(call_contrib, 4)
            score += call_contrib
        elif call_ended_ago is not None and call_ended_ago < 90:
            # Call abruptly dropped seconds before checkout
            recent_call_contrib = 0.35 * max(0.0, (90 - call_ended_ago) / 90.0)
            signals["recently_terminated_voice_call"] = round(recent_call_contrib, 4)
            score += recent_call_contrib

        # 2. Remote Screen-Sharing Exploitation Evaluation
        if screen_share:
            screen_contrib = 0.65
            if accessibility:
                screen_contrib += 0.20
            signals["screen_sharing_remote_access"] = round(screen_contrib, 4)
            score += screen_contrib
        elif accessibility:
            signals["untrusted_accessibility_hook"] = 0.25
            score += 0.25

        # 3. Behavioral PIN Entry Hesitation & Jitter
        # Normal typing jitter is 20-50ms. High anxiety / coerced dictation produces > 120ms jitter
        if jitter_ms > 100.0:
            jitter_contrib = min(0.20, (jitter_ms - 100.0) / 400.0)
            signals["typing_hesitation_jitter"] = round(jitter_contrib, 4)
            score += jitter_contrib

        # 4. Beneficiary Novelty Combined with High Exposure
        if is_new_payee and amount_inr > 15000.0:
            novelty_contrib = min(0.30, (amount_inr / 50000.0) * 0.25)
            signals["new_beneficiary_high_amount"] = round(novelty_contrib, 4)
            score += novelty_contrib

        # 5. Rapid Velocity / Threshold Structuring Attempts
        if tx_last_10m >= 2:
            velocity_contrib = min(0.25, tx_last_10m * 0.08)
            signals["rapid_burst_velocity"] = round(velocity_contrib, 4)
            score += velocity_contrib

        # Sigmoid squash to bounded [0, 1]
        coercion_index = 1.0 / (1.0 + math.exp(-3.5 * (score - 0.5)))
        coercion_index = max(0.01, min(0.99, coercion_index))

        return round(coercion_index, 4), signals


coercion_engine = CoercionEngine()
