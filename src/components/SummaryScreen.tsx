import { ArrowRight } from "lucide-react";
import type { SummaryCounts } from "../types";

export function SummaryScreen({
  counts,
  onOpenQueue,
}: {
  counts: SummaryCounts;
  onOpenQueue: () => void;
}) {
  const nextAction =
    counts.critical > 0
      ? "Start with critical Buy Box recoveries."
      : counts.warning > 0
        ? "Start with margin opportunities."
        : counts.blocked > 0
          ? "Start with blocked SKUs."
          : "Review held SKUs.";

  return (
    <main className="summary-screen">
      <section className="summary-panel">
        <p className="eyebrow">Pricing brief</p>
        <h1>{counts.needsAttention} SKUs need attention today</h1>
        <p className="summary-lead">{nextAction}</p>

        <div className="summary-grid">
          <SummaryItem tone="critical" value={counts.critical} label="Recoverable Buy Box losses" />
          <SummaryItem tone="warning" value={counts.warning} label="Price increase opportunities" />
          <SummaryItem tone="blocked" value={counts.blocked} label="Margin-floor blocks" />
          <SummaryItem tone="held" value={counts.hold} label="Stable SKUs held back" />
        </div>

        <div className="guardrail-note">
          <strong>Guardrails applied</strong>
          <span>No recommendation goes below margin floor. Items changed today are held back.</span>
        </div>

        <button className="primary-button" onClick={onOpenQueue}>
          Open decision queue
          <ArrowRight size={18} />
        </button>
      </section>
    </main>
  );
}

function SummaryItem({
  tone,
  value,
  label,
}: {
  tone: "critical" | "warning" | "blocked" | "held";
  value: number;
  label: string;
}) {
  return (
    <div className={`summary-item ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
