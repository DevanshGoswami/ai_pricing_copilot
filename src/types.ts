export type RawSku = {
  sku: string;
  brand: string;
  ourPrice: number;
  competitorPrice: number;
  buyBox: "Won" | "Lost";
  marginFloor: number;
  lastChanged: string;
};

export type TriageKind = "critical" | "warning" | "hold" | "non_actionable";

export type Guardrail = {
  kind: TriageKind;
  label: string;
  targetPrice: number | null;
  safeMinPrice: number | null;
  safeMaxPrice: number | null;
  action: "lower" | "raise" | "hold" | "escalate";
  businessGoal: string;
  rationale: string;
  floorDelta: number;
  competitorDelta: number;
  priority: number;
};

export type GeminiRecommendation = {
  sku: string;
  action: "lower" | "raise" | "hold" | "escalate";
  recommendation: string;
  tradeoff: string;
  risk: "Low" | "Medium" | "High";
  reason_code: string;
  confidence: "High" | "Medium" | "Low";
  decision_price: number | null;
};

export type Recommendation = Guardrail & {
  sku: RawSku;
  aiSentence: string;
  tradeoff: string;
  risk: "Low" | "Medium" | "High";
  reasonCode: string;
  confidence: "High" | "Medium" | "Low";
  applied: boolean;
  appliedPrice: number | null;
  syncStatus: "idle" | "pending";
};

export type SummaryCounts = {
  needsAttention: number;
  critical: number;
  warning: number;
  blocked: number;
  hold: number;
};
