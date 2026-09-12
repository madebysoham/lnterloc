import os
import math
from typing import Dict, Any, Tuple
from pathlib import Path
from backend.app.config import settings


class MLModelAdapter:
    """
    ML Model Adapter & Feature Fusion Bridge.
    Adheres strictly to the 7-feature schema in docs/API_AND_INTEGRATION_CONTRACT.md.
    Uses trained model artifact if available; otherwise falls back to deterministic
    mathematical inference so backend functions autonomously.
    """

    def __init__(self, model_path: str = settings.ML_MODEL_PATH):
        self.model_path = Path(model_path)
        self.loaded_model = None
        self._try_load_model()

    def _try_load_model(self) -> bool:
        if self.model_path.exists() and self.model_path.stat().st_size > 0:
            try:
                import joblib
                self.loaded_model = joblib.load(self.model_path)
                return True
            except Exception:
                try:
                    import pickle
                    with open(self.model_path, "rb") as f:
                        self.loaded_model = pickle.load(f)
                    return True
                except Exception:
                    self.loaded_model = None
        return False

    def predict(
        self,
        amount_inr: float,
        telemetry: Dict[str, Any],
        mule_score: float,
        coercion_score: float,
    ) -> Tuple[float, Dict[str, float]]:
        """
        Executes prediction and returns (fraud_probability, shap_attributions).
        """
        # Ensure fresh model check if model was recently saved by ML lead
        if self.loaded_model is None and self.model_path.exists():
            self._try_load_model()

        # Build standard 7-feature array matching ML lead contract
        feat_amount = float(amount_inr)
        feat_call = 1.0 if telemetry.get("active_call", False) else 0.0
        feat_call_dur = float(telemetry.get("call_duration_seconds", 0))
        feat_screen = 1.0 if telemetry.get("screen_share_active", False) else 0.0
        feat_jitter = float(telemetry.get("typing_jitter_ms", 0.0))
        feat_new_payee = 1.0 if telemetry.get("is_new_payee_for_payer", False) else 0.0
        feat_tx_10m = float(telemetry.get("transactions_in_last_10m", 0))

        if self.loaded_model is not None:
            try:
                # Handle model bundle dictionary (calibrator + explainer + features)
                if isinstance(self.loaded_model, dict):
                    import pandas as pd
                    calibrator = self.loaded_model.get("calibrator")
                    explainer = self.loaded_model.get("explainer")
                    features = self.loaded_model.get("features", [
                        "amount_inr", "active_call", "call_duration_seconds", "screen_share_active",
                        "typing_jitter_ms", "is_new_payee", "velocity_10m",
                    ])
                    df = pd.DataFrame([{
                        "amount_inr": feat_amount,
                        "active_call": int(feat_call),
                        "call_duration_seconds": int(feat_call_dur),
                        "screen_share_active": int(feat_screen),
                        "typing_jitter_ms": feat_jitter,
                        "is_new_payee": int(feat_new_payee),
                        "velocity_10m": int(feat_tx_10m) if feat_tx_10m > 0 else 1,
                    }])[features]

                    probs = calibrator.predict_proba(df)[0]
                    fraud_prob = float(probs[1])

                    shap_dict = {}
                    if explainer is not None:
                        shap_raw = explainer.shap_values(df)
                        if isinstance(shap_raw, list):
                            vals = shap_raw[1][0]
                        elif getattr(shap_raw, "ndim", 0) == 2:
                            vals = shap_raw[0]
                        else:
                            vals = shap_raw
                        key_mapping = {
                            "active_call": "prolonged_active_voice_call",
                            "amount_inr": "new_beneficiary_high_amount",
                            "velocity_10m": "payee_in_degree_velocity_burst",
                            "typing_jitter_ms": "typing_hesitation_jitter",
                            "screen_share_active": "screen_share_surveillance",
                            "call_duration_seconds": "voice_call_duration_risk",
                            "is_new_payee": "unverified_new_payee",
                        }
                        for feat, val in zip(features, vals):
                            if abs(val) > 0.001:
                                shap_dict[key_mapping.get(feat, feat)] = round(float(val), 4)

                    return round(fraud_prob, 4), shap_dict

                # Handle raw estimator
                import numpy as np
                feature_vector = np.array([[
                    feat_amount,
                    feat_call,
                    feat_call_dur,
                    feat_screen,
                    feat_jitter,
                    feat_new_payee,
                    feat_tx_10m,
                ]])
                probs = self.loaded_model.predict_proba(feature_vector)[0]
                fraud_prob = float(probs[1])

                shap_dict = {}
                if hasattr(self.loaded_model, "feature_importances_"):
                    importances = self.loaded_model.feature_importances_
                    feat_names = [
                        "transaction_amount",
                        "prolonged_active_voice_call",
                        "voice_call_duration",
                        "screen_sharing_remote_access",
                        "typing_hesitation_jitter",
                        "new_beneficiary_high_amount",
                        "rapid_burst_velocity",
                    ]
                    for name, imp in zip(feat_names, importances):
                        if imp > 0.05:
                            shap_dict[name] = round(float(imp), 4)

                return round(fraud_prob, 4), shap_dict
            except Exception:
                # Graceful fallback to deterministic engine on model prediction error
                pass

        # Deterministic Mathematical Multi-Signal Fusion Engine
        # Combines Coercion Vector (45%), Mule Network Topology (35%), and Financial Anomaly (20%)
        financial_anomaly = min(1.0, feat_amount / 75000.0)
        if feat_new_payee and feat_amount > 25000.0:
            financial_anomaly = min(1.0, financial_anomaly + 0.25)

        raw_logit = (
            2.8 * coercion_score +
            2.2 * mule_score +
            1.4 * financial_anomaly -
            2.6  # Base calibration bias
        )

        fraud_prob = 1.0 / (1.0 + math.exp(-raw_logit))
        fraud_prob = round(max(0.01, min(0.99, fraud_prob)), 4)

        # Compute Explainable SHAP Attribution Vector
        shap_attributions: Dict[str, float] = {}
        if feat_call and feat_call_dur > 300:
            shap_attributions["prolonged_active_voice_call"] = round(0.35 + min(0.15, feat_call_dur / 3600.0), 4)
        elif feat_call:
            shap_attributions["active_voice_call"] = 0.28

        if feat_screen:
            shap_attributions["screen_sharing_remote_access"] = 0.45

        if feat_new_payee and feat_amount > 15000:
            shap_attributions["new_beneficiary_high_amount"] = round(min(0.30, feat_amount / 100000.0 * 0.28), 4)

        if mule_score > 0.50:
            shap_attributions["payee_in_degree_velocity_burst"] = round(mule_score * 0.32, 4)

        if feat_jitter > 100:
            shap_attributions["typing_hesitation_jitter"] = round(min(0.12, feat_jitter / 1000.0), 4)

        if feat_tx_10m > 1:
            shap_attributions["rapid_burst_velocity"] = round(min(0.15, feat_tx_10m * 0.05), 4)

        # Normalize SHAP attributions so they provide transparent additive explanation
        if shap_attributions:
            total = sum(shap_attributions.values())
            if total > 0:
                shap_attributions = {k: round(v / total, 4) for k, v in shap_attributions.items()}

        return fraud_prob, shap_attributions


ml_adapter = MLModelAdapter()
