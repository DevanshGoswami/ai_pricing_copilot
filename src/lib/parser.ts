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

function parseBuyBox(value: unknown): "Won" | "Lost" {
  return String(value).toLowerCase().includes("won") ? "Won" : "Lost";
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
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  return parseRows(rows);
}
