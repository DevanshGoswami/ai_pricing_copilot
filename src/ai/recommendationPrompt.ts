import type { Guardrail, RawSku } from "../types";

export function buildRecommendationPrompt(items: Array<{ sku: RawSku; guardrail: Guardrail }>) {
  return `You are a category pricing specialist for Opptra. Choose decision-ready marketplace pricing actions.

Business rules:
- Never recommend a price below margin_floor.
- If guardrail_action is "hold" or "escalate", decision_price must be null.
- If guardrail_action is "lower" or "raise", choose one integer decision_price within safe_min_price and safe_max_price.
- Do not always choose the most aggressive price. Use the competitor price, margin room, and business goal.
- For Buy Box recovery, prefer a price near Rs.10 below competitor when it is safely above floor.
- For margin improvement, raise meaningfully while remaining below competitor.
- Recommendations must be one sentence with the exact SKU, exact decision price when actionable, why, and margin buffer percentage.
- Calculate margin buffer percentage as ((decision_price - margin_floor) / decision_price) * 100, rounded to one decimal.
- Tradeoff must quantify the unit revenue change versus our current price.
- Avoid vague phrases like "consider" or "monitor".
- Return risk as Low, Medium, or High based on margin room and competitiveness.

Return JSON only in this shape. The values below are examples only; do not copy them unless they match the input:
[
  {
    "sku": "SKU-001",
    "action": "lower",
    "decision_price": 1189,
    "recommendation": "Set SKU-001 to Rs.1,189 - Rs.10 below competitor and Rs.139 above margin floor, a 11.7% margin buffer. Recovers Buy Box while protecting floor.",
    "tradeoff": "Recovers Buy Box but gives up Rs.110 revenue per unit.",
    "risk": "Low",
    "reason_code": "recover_buy_box",
    "confidence": "High"
  }
]

Input:
${JSON.stringify(
    items.map(({ sku, guardrail }) => ({
      sku: sku.sku,
      brand: sku.brand,
      our_price: sku.ourPrice,
      competitor_price: sku.competitorPrice,
      buy_box: sku.buyBox,
      margin_floor: sku.marginFloor,
      last_changed: sku.lastChanged,
      guardrail_action: guardrail.action,
      safe_min_price: guardrail.safeMinPrice,
      safe_max_price: guardrail.safeMaxPrice,
      fallback_target_price: guardrail.targetPrice,
      business_goal: guardrail.businessGoal,
      guardrail_rationale: guardrail.rationale,
    })),
    null,
    2,
  )}`;
}
