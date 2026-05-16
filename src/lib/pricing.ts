import type { GeminiRecommendation, Guardrail, RawSku, Recommendation, SummaryCounts, TriageKind } from "../types";
import { currency } from "../utils/format";

const kindOrder: Record<TriageKind, number> = {
  critical: 0,
  warning: 1,
  non_actionable: 2,
  hold: 3,
};

function changedToday(value: string) {
  return value.trim().toLowerCase() === "today";
}

export function buildGuardrail(sku: RawSku): Guardrail {
  const beatBy = 10;
  const priceGap = sku.competitorPrice - sku.ourPrice;
  const marginRoom = sku.ourPrice - sku.marginFloor;

  if (sku.buyBox === "Lost") {
    const safeMinPrice = sku.marginFloor;
    const safeMaxPrice = Math.min(sku.ourPrice - 1, sku.competitorPrice - 1);
    const fallbackTarget = Math.max(safeMinPrice, sku.competitorPrice - beatBy);
    if (safeMaxPrice < safeMinPrice) {
      return {
        kind: "non_actionable",
        label: "Margin floor block",
        targetPrice: null,
        safeMinPrice: null,
        safeMaxPrice: null,
        action: "escalate",
        businessGoal: "Escalate because the competitor cannot be matched without breaching margin floor.",
        rationale: "Competitor is below the margin floor, so matching would destroy protected margin.",
        floorDelta: sku.competitorPrice - sku.marginFloor,
        competitorDelta: sku.ourPrice - sku.competitorPrice,
        priority: 92,
      };
    }
    return {
      kind: "critical",
      label: "Recover Buy Box",
      targetPrice: fallbackTarget,
      safeMinPrice,
      safeMaxPrice,
      action: "lower",
      businessGoal: "Recover Buy Box while staying above the margin floor.",
      rationale: `Choose a lower price between ${currency.format(safeMinPrice)} and ${currency.format(
        safeMaxPrice,
      )}; ${currency.format(fallbackTarget)} is the fallback target, ${currency.format(
        fallbackTarget - sku.marginFloor,
      )} above floor.`,
      floorDelta: fallbackTarget - sku.marginFloor,
      competitorDelta: sku.ourPrice - sku.competitorPrice,
      priority: 100 + sku.ourPrice - sku.competitorPrice,
    };
  }

  if (changedToday(sku.lastChanged)) {
    return {
      kind: "hold",
      label: "Already changed today",
      targetPrice: null,
      safeMinPrice: null,
      safeMaxPrice: null,
      action: "hold",
      businessGoal: "Hold because the SKU is already winning and was changed today.",
      rationale: "Winning Buy Box and already changed today. Avoid repricing too frequently.",
      floorDelta: marginRoom,
      competitorDelta: priceGap,
      priority: 10,
    };
  }

  const lowMargin = marginRoom / sku.ourPrice < 0.18;
  const meaningfulHeadroom = priceGap >= Math.max(50, sku.ourPrice * 0.06);

  if (priceGap > 20 && (lowMargin || meaningfulHeadroom)) {
    const safeMinPrice = sku.ourPrice + 1;
    const safeMaxPrice = sku.competitorPrice - 1;
    const fallbackTarget = Math.min(safeMaxPrice, Math.max(safeMinPrice, sku.competitorPrice - beatBy));
    return {
      kind: "warning",
      label: lowMargin ? "Raise margin carefully" : "Price increase opportunity",
      targetPrice: fallbackTarget,
      safeMinPrice,
      safeMaxPrice,
      action: "raise",
      businessGoal: "Improve margin while likely retaining the Buy Box.",
      rationale: `Choose a higher price between ${currency.format(safeMinPrice)} and ${currency.format(
        safeMaxPrice,
      )}; ${currency.format(fallbackTarget)} is the fallback target and stays ${currency.format(
        sku.competitorPrice - fallbackTarget,
      )} below competitor.`,
      floorDelta: fallbackTarget - sku.marginFloor,
      competitorDelta: sku.competitorPrice - fallbackTarget,
      priority: 70 + priceGap,
    };
  }

  return {
    kind: "hold",
    label: "Hold position",
    targetPrice: null,
    safeMinPrice: null,
    safeMaxPrice: null,
    action: "hold",
    businessGoal: "Hold because the SKU is already winning with limited safe upside.",
    rationale: "Winning Buy Box with limited safe upside right now.",
    floorDelta: marginRoom,
    competitorDelta: priceGap,
    priority: 20,
  };
}

function fallbackSentence(sku: RawSku, guardrail: Guardrail) {
  if (guardrail.action === "lower" && guardrail.targetPrice) {
    const marginBufferPercent = (((guardrail.targetPrice - sku.marginFloor) / guardrail.targetPrice) * 100).toFixed(1);
    return `Set ${sku.sku} to ${currency.format(guardrail.targetPrice)} to undercut the competitor while staying ${currency.format(
      guardrail.targetPrice - sku.marginFloor,
    )} above the margin floor, a ${marginBufferPercent}% margin buffer.`;
  }
  if (guardrail.action === "raise" && guardrail.targetPrice) {
    const marginBufferPercent = (((guardrail.targetPrice - sku.marginFloor) / guardrail.targetPrice) * 100).toFixed(1);
    return `Raise ${sku.sku} to ${currency.format(
      guardrail.targetPrice,
    )} to capture margin while remaining below the competitor, with a ${marginBufferPercent}% margin buffer.`;
  }
  if (guardrail.action === "escalate") {
    return `Do not match the competitor on ${sku.sku}; their price is below the margin floor, so this needs manual review.`;
  }
  return `Hold ${sku.sku}; it is winning and does not need another price move right now.`;
}

function isAiDecisionValid(sku: RawSku, guardrail: Guardrail, ai: GeminiRecommendation | undefined) {
  if (!ai || ai.action !== guardrail.action) return false;

  const aiPrice = ai.decision_price;
  if (guardrail.action === "hold" || guardrail.action === "escalate") return aiPrice === null;
  if (aiPrice === null || guardrail.safeMinPrice === null || guardrail.safeMaxPrice === null) return false;
  if (aiPrice < guardrail.safeMinPrice || aiPrice > guardrail.safeMaxPrice) return false;
  if (aiPrice < sku.marginFloor) return false;
  if (guardrail.action === "lower") return aiPrice < sku.ourPrice && aiPrice < sku.competitorPrice;
  if (guardrail.action === "raise") return aiPrice > sku.ourPrice && aiPrice < sku.competitorPrice;
  return false;
}

export function mergeRecommendations(
  items: Array<{ sku: RawSku; guardrail: Guardrail }>,
  aiItems: GeminiRecommendation[],
) {
  const bySku = new Map(aiItems.map((item) => [item.sku, item]));
  return items
    .map(({ sku, guardrail }) => {
      const ai = bySku.get(sku.sku);
      const aiPriceIsValid = isAiDecisionValid(sku, guardrail, ai);
      const useAiText = Boolean(ai?.recommendation && aiPriceIsValid);
      const renderedTargetPrice = aiPriceIsValid ? ai!.decision_price : guardrail.targetPrice;
      const recommendation: Recommendation = {
        ...guardrail,
        targetPrice: renderedTargetPrice,
        sku,
        aiSentence: useAiText ? ai!.recommendation : fallbackSentence(sku, guardrail),
        tradeoff: useAiText && ai?.tradeoff ? ai.tradeoff : guardrail.rationale,
        risk: useAiText && ai?.risk ? ai.risk : "Medium",
        reasonCode: useAiText && ai?.reason_code ? ai.reason_code : guardrail.action,
        confidence: ai?.confidence || "Medium",
        applied: false,
        appliedPrice: null,
        syncStatus: "idle",
      };
      return recommendation;
    })
    .sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || b.priority - a.priority);
}

export function summaryCopy(recommendations: Recommendation[]): SummaryCounts {
  const needsAttention = recommendations.filter((item) => item.kind !== "hold").length;
  const critical = recommendations.filter((item) => item.kind === "critical").length;
  const warning = recommendations.filter((item) => item.kind === "warning").length;
  const blocked = recommendations.filter((item) => item.kind === "non_actionable").length;
  const hold = recommendations.filter((item) => item.kind === "hold").length;

  return { needsAttention, critical, warning, blocked, hold };
}
