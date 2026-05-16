import type { ChangeEvent, RefObject } from "react";
import { AlertTriangle, LockKeyhole, Sparkles, Upload } from "lucide-react";
import logoUrl from "../../optra.png";

export function Landing({
  error,
  inputRef,
  onFile,
}: {
  error: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <section className="hero">
      <nav>
        <img src={logoUrl} alt="Opptra" />
        <span>Pricing Ops</span>
      </nav>
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">AI Pricing Copilot</p>
          <h1>Turn marketplace price noise into approved actions in minutes.</h1>
          <p>
            Upload today&apos;s SKU sheet. The copilot reads Buy Box status, protects margin
            floors, and returns exact pricing decisions for the category team.
          </p>
          <div className="upload-row">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={onFile}
            />
            <button className="upload-button" onClick={() => inputRef.current?.click()}>
              <Upload size={20} />
              Upload pricing file
            </button>
            <span>CSV, XLS, or XLSX</span>
          </div>
          {error && <div className="error-banner">{error}</div>}
        </div>
        <div className="signal-board" aria-hidden="true">
          <div>
            <AlertTriangle />
            <strong>Lost Buy Box</strong>
            <span>Recover if floor allows</span>
          </div>
          <div>
            <Sparkles />
            <strong>Margin upside</strong>
            <span>Raise without losing position</span>
          </div>
          <div>
            <LockKeyhole />
            <strong>Floor protected</strong>
            <span>No below-floor recommendation</span>
          </div>
        </div>
      </div>
    </section>
  );
}
