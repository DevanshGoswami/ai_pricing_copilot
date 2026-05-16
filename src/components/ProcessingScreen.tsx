export function ProcessingScreen({ fileName }: { fileName: string }) {
  return (
    <main className="processing">
      <p className="eyebrow">Processing {fileName}</p>
      <h1>Reading prices, checking floors, and preparing decisions.</h1>
      <div className="progress-track">
        <span />
      </div>
    </main>
  );
}
