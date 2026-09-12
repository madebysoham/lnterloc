### PS2 : Real-Time Authorised Push Payment (APP) Fraud Interceptor & Mule-Chain Tracer

**CONTEXT & INDUSTRY BACKGROUND:**
Authorised Push Payment (APP) fraud (users coaxed into authorizing payments quickly moved through mule accounts) is viewed as a systemic risk by RBI. RBI's shift toward compensation frameworks covering small fraudulent transactions requires real-time proof of coerced payment, demanding rapid detection, interception, and fund tracing through mule chains before post-facto fraud reporting.

**PROBLEM STATEMENT & OBJECTIVE:**
Develop and implement a real-time transaction interceptor capable of evaluating in-flight UPI-style push payments for APP fraud likelihood, taking decisive action, tracing intended paths of flagged funds, and quantifying actual financial risk using real currency units.

**KEY TECHNICAL SPECIFICATIONS:**
*   **#1. Multi-Signal Behavioral Evaluation:** Evaluate each transaction with multiple independent signals (payee/amount/time/device pattern deviations, payee risk from multiple incoming sources, contextual urgency like active calls/app switches, transaction structuring below thresholds).
*   **#2. Defendable Risk Score Fusion:** Fuse individual signals into a unified risk score with documented signal contributions.
*   **#3. Time-Decay Mule Chain Recoverability Model:** Simulate movement of flagged funds through mule networks with time-decayed models of onward transactions across chain lengths to calculate "recoverable vs. lost" estimates over time.
*   **#4. Expected Financial Cost Decision Engine:** Compare friction cost to legitimate payments against compensation liability if fraudulent payments pass (based on recoverability estimates), deciding action (approve / delay with verification / block).
*   **#5. Tunable Policy Trade-Off Interface:** Provide an interface for modifying false positive vs compensation liability trade-offs, dynamically updating decision boundaries.
*   **#6. Realistic Step-Up Friction Protocol:** Implement soft holds followed by alternative-factor re-confirmation, with protocol handling for further transaction attempts while on hold.
*   **#7. Auditable Compliance Explainability Trail:** Maintain complete explainability records per held transaction (fired signals, fused score, decision rationale, hold outcome) suitable for regulatory compliance querying.
*   **#8. Adversarial Countermeasure Evaluation:** Test system against gamed scoring (structuring evasion, false baseline building, delayed suspicious transactions) with quantifiable catch-rate improvements.
*   **#9. Portfolio Risk & Financial Impact Reporting:** Generate portfolio-level reports showing screened transactions, held count, avoided compensation liability (in real currency), and false-positive/friction rates.
*   **#10. Justified Modeling Choices:** Fully document and justify all modeling choices (decay estimates, cost calculations, fusion weighting).

**SCORING GUIDE & EVALUATION CRITERIA:**
Grounding in real UPI/payment-fraud typologies, published RBI guidance, or realistic transaction/mule data earns extra points. Discriminatory power of fusion score, expected-cost decision logic, adversarial evaluation, explainability trail. Mandatory GitHub Actions deployment.