import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { askGemini } from "./ai/gemini";
import { Landing } from "./components/Landing";
import { ProcessingScreen } from "./components/ProcessingScreen";
import { SummaryScreen } from "./components/SummaryScreen";
import { Workspace } from "./components/Workspace";
import { parseFile } from "./lib/parser";
import { buildGuardrail, mergeRecommendations, summaryCopy } from "./lib/pricing";
import type { Recommendation } from "./types";

type Phase = "landing" | "processing" | "summary" | "workspace";

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("landing");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [applyingSku, setApplyingSku] = useState<string | null>(null);

  const counts = useMemo(() => summaryCopy(recommendations), [recommendations]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);
    setPhase("processing");

    try {
      const rows = await parseFile(file);
      const guarded = rows.map((sku) => ({ sku, guardrail: buildGuardrail(sku) }));
      const aiItems = await askGemini(guarded);
      setRecommendations(mergeRecommendations(guarded, aiItems));
      setPhase("summary");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not process the uploaded file.";
      setError(message);
      setPhase("landing");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function applyRecommendation(sku: string) {
    setApplyingSku(sku);
    window.setTimeout(() => {
      setRecommendations((current) =>
        current.map((item) =>
          item.sku.sku === sku && item.targetPrice
            ? {
                ...item,
                applied: true,
                appliedPrice: item.targetPrice,
                syncStatus: "pending",
                sku: {
                  ...item.sku,
                  ourPrice: item.targetPrice,
                  buyBox: item.action === "lower" ? "Won" : item.sku.buyBox,
                  lastChanged: "Today",
                },
                label: "Repriced",
              }
            : item,
        ),
      );
      setApplyingSku(null);
    }, 900);
  }

  if (phase === "processing") {
    return <ProcessingScreen fileName={fileName} />;
  }

  if (phase === "summary") {
    return <SummaryScreen counts={counts} onOpenQueue={() => setPhase("workspace")} />;
  }

  return (
    <main className={phase === "landing" ? "landing" : "app-shell"}>
      {phase === "landing" ? (
        <Landing error={error} inputRef={inputRef} onFile={handleFile} />
      ) : (
        <Workspace
          recommendations={recommendations}
          counts={counts}
          applyingSku={applyingSku}
          onApply={applyRecommendation}
          onUploadAnother={() => setPhase("landing")}
        />
      )}
    </main>
  );
}
