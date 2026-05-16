import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Loader2,
  LockKeyhole,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import logoUrl from "../../optra.png";
import type { Recommendation, SummaryCounts, TriageKind } from "../types";
import { currency } from "../utils/format";

type FilterKey = "all" | TriageKind;

const filters: Array<{
  key: FilterKey;
  label: string;
  getValue: (counts: SummaryCounts, total: number) => number;
}> = [
  { key: "all", label: "All", getValue: (_counts, total) => total },
  { key: "critical", label: "Critical", getValue: (counts) => counts.critical },
  { key: "warning", label: "Warnings", getValue: (counts) => counts.warning },
  { key: "non_actionable", label: "Blocked", getValue: (counts) => counts.blocked },
  { key: "hold", label: "Held", getValue: (counts) => counts.hold },
];

export function Workspace({
  recommendations,
  counts,
  applyingSku,
  onApply,
  onUploadAnother,
}: {
  recommendations: Recommendation[];
  counts: SummaryCounts;
  applyingSku: string | null;
  onApply: (sku: string) => void;
  onUploadAnother: () => void;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const visibleRecommendations = useMemo(
    () =>
      activeFilter === "all"
        ? recommendations
        : recommendations.filter((item) => item.kind === activeFilter),
    [activeFilter, recommendations],
  );
  const activeLabel = filters.find((filter) => filter.key === activeFilter)?.label ?? "All";

  return (
    <>
      <header className="topbar">
        <div>
          <img src={logoUrl} alt="Opptra" />
          <span>AI Pricing Copilot</span>
        </div>
        <button className="ghost-button" onClick={onUploadAnother}>
          <FileSpreadsheet size={17} />
          New file
        </button>
      </header>

      <section className="decision-header">
        <div>
          <p className="eyebrow">Decision queue</p>
          <h1>
            {visibleRecommendations.length}{" "}
            {activeFilter === "all" ? "SKUs need operator attention" : `${activeLabel} SKUs`}
          </h1>
        </div>
        <div className="metric-strip">
          {filters.map((filter) => (
            <Metric
              key={filter.key}
              filterKey={filter.key}
              label={filter.label}
              value={filter.getValue(counts, recommendations.length)}
              active={activeFilter === filter.key}
              onClick={() => setActiveFilter(filter.key)}
            />
          ))}
        </div>
      </section>

      <section className="triage-list">
        {visibleRecommendations.map((item) => (
          <RecommendationCard
            key={item.sku.sku}
            item={item}
            applying={applyingSku === item.sku.sku}
            onApply={() => onApply(item.sku.sku)}
          />
        ))}
      </section>
    </>
  );
}

function Metric({
  filterKey,
  label,
  value,
  active,
  onClick,
}: {
  filterKey: FilterKey;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`metric-card ${filterKey} ${active ? "active" : ""}`}
      type="button"
      onClick={onClick}
      aria-pressed={active}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

function RecommendationCard({
  item,
  applying,
  onApply,
}: {
  item: Recommendation;
  applying: boolean;
  onApply: () => void;
}) {
  const icon = {
    critical: <XCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    hold: <Clock3 size={20} />,
    non_actionable: <LockKeyhole size={20} />,
  }[item.kind];

  return (
    <article className={`recommendation-card ${item.kind}`}>
      <div className="card-main">
        <div className="status-pill">
          {icon}
          {item.label}
        </div>
        <h2>
          {item.sku.sku} <span>{item.sku.brand || "Unbranded"}</span>
        </h2>
        <p className="recommendation-text">{item.aiSentence}</p>
        <div className="decision-meta">
          <span>Risk: {item.risk}</span>
          <span>{item.reasonCode.replace(/_/g, " ")}</span>
        </div>
        <p className="tradeoff">{item.tradeoff}</p>
      </div>

      <div className="price-panel">
        <PriceLine label={item.applied ? "Current price" : "Our price"} value={item.sku.ourPrice} />
        <PriceLine label="Competitor" value={item.sku.competitorPrice} />
        <PriceLine label="Margin floor" value={item.sku.marginFloor} />
        <PriceLine label="Decision" value={item.targetPrice} strong />
        <div className="buybox-row">
          <span>Buy Box</span>
          <strong>{item.sku.buyBox}</strong>
        </div>
        <div className="action-slot">
          {item.applied ? (
            <div className="applied-state">
              <div className="applied-title">
                <CheckCircle2 size={18} />
                <strong>Repriced</strong>
              </div>
              <span>Applied at {currency.format(item.appliedPrice ?? item.sku.ourPrice)}</span>
              <span>Pending marketplace sync</span>
            </div>
          ) : item.targetPrice ? (
            <button className="apply-button" onClick={onApply} disabled={applying}>
              {applying ? <Loader2 size={18} /> : <Check size={18} />}
              Apply
            </button>
          ) : (
            <button className="disabled-button" disabled>
              No price action
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function PriceLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: number | null;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "price-line strong" : "price-line"}>
      <span>{label}</span>
      <strong>{value === null ? "Hold" : currency.format(value)}</strong>
    </div>
  );
}
