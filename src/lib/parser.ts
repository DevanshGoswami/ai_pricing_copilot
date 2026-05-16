import * as XLSX from "xlsx";
import type { RawSku } from "../types";

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanMoney(value: unknown) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "")
    .replace(/rs\.?/gi, "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "");
  return Number(cleaned);
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += character;
  }

  cells.push(cell.trim());
  return cells;
}

function readMoneyCell(cells: string[], index: number) {
  const current = cells[index] ?? "";
  const next = cells[index + 1] ?? "";
  const isSplitThousands =
    /^rs\.?\s*\d+$/i.test(current.trim()) && /^\d{3}$/.test(next.trim());

  if (isSplitThousands) {
    return { value: cleanMoney(`${current}${next}`), nextIndex: index + 2 };
  }

  return { value: cleanMoney(current), nextIndex: index + 1 };
}

function parseBuyBox(value: unknown): "Won" | "Lost" {
  return String(value).toLowerCase().includes("won") ? "Won" : "Lost";
}

function parseLoosePricingCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const header = parseCsvLine(lines[0] ?? "").map(normalizeKey);
  const isKnownPricingExport =
    header.includes("sku") &&
    header.includes("ourprice") &&
    (header.includes("competitorbuybox") || header.includes("competitorprice")) &&
    header.includes("marginfloor");

  if (!isKnownPricingExport) return null;

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    let index = 0;
    const sku = cells[index++] ?? "";
    const brand = cells[index++] ?? "";
    const our = readMoneyCell(cells, index);
    index = our.nextIndex;
    const competitor = readMoneyCell(cells, index);
    index = competitor.nextIndex;
    index += 1;
    const status = cells[index++] ?? "";
    const floor = readMoneyCell(cells, index);
    index = floor.nextIndex;

    return {
      sku,
      brand,
      ourPrice: our.value,
      competitorPrice: competitor.value,
      buyBox: parseBuyBox(status),
      marginFloor: floor.value,
      lastChanged: cells.slice(index).filter(Boolean).join(", "),
    };
  });
}

function findCell(row: Record<string, unknown>, candidates: string[]) {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
  );
  for (const candidate of candidates) {
    const value = normalized[normalizeKey(candidate)];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function parseRows(rows: Record<string, unknown>[]) {
  const parsed = rows
    .map((row) => ({
      sku: String(findCell(row, ["sku", "product sku", "item id"])).trim(),
      brand: String(findCell(row, ["brand", "brand name"])).trim(),
      ourPrice: cleanMoney(findCell(row, ["our price", "price", "current price"])),
      competitorPrice: cleanMoney(
        findCell(row, ["competitor", "competitor price", "competitor buy box", "market price"]),
      ),
      buyBox: parseBuyBox(findCell(row, ["buy box", "buybox", "status"])),
      marginFloor: cleanMoney(findCell(row, ["margin floor", "floor", "min price"])),
      lastChanged: String(findCell(row, ["last changed", "updated", "last update"])).trim(),
    }))
    .filter(
      (row) =>
        row.sku &&
        Number.isFinite(row.ourPrice) &&
        Number.isFinite(row.competitorPrice) &&
        Number.isFinite(row.marginFloor),
    );

  if (!parsed.length) {
    throw new Error(
      "No valid SKU rows found. Include SKU, Our Price, Competitor Price, Buy Box, Margin Floor, and Last Changed columns.",
    );
  }

  return parsed;
}

export async function parseFile(file: File): Promise<RawSku[]> {
  if (file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv") {
    const parsed = parseLoosePricingCsv(await file.text());
    if (parsed) return parsed;
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  return parseRows(rows);
}
