# AI Pricing Copilot

A browser prototype for Opptra category operators. Upload a pricing sheet, let Gemini write decision-ready recommendations, and apply safe price moves without violating margin floors.

## Run Locally

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env.local`:

   ```bash
   VITE_GEMINI_API_KEY=your_google_ai_studio_api_key_here
   VITE_GEMINI_MODEL=gemini-2.0-flash
   ```

3. Start the app:

   ```bash
   pnpm dev
   ```

## Gemini API Key

Create an API key in Google AI Studio, then paste it into `.env.local` as `VITE_GEMINI_API_KEY`.

This prototype calls Gemini directly from the browser through `generateContent`, so the key is visible to the browser during local development. For production, move the Gemini call behind a small backend or serverless function.

## Upload Format

The app accepts `.csv`, `.xls`, and `.xlsx` files. The first sheet should include columns equivalent to:

- `SKU`
- `Brand`
- `Our Price`
- `Competitor Price` or `Competitor`
- `Buy Box`
- `Margin Floor`
- `Last Changed`

Currency symbols and commas are accepted.

## Pricing Logic

- Lost Buy Box and competitor can be beaten above margin floor: critical repricing action.
- Lost Buy Box but competitor is below margin floor: non-actionable escalation.
- Won Buy Box and changed today: hold, no repeated repricing.
- Won Buy Box with margin/headroom opportunity: warning with a controlled price raise.
- Gemini is prompted as a category pricing specialist, but deterministic guardrails validate the output before rendering it.

## Design Note

I designed the prototype as a decision surface rather than a dashboard. After upload, the pricing brief gives the operator a quick read on the criticality of the file: how many SKUs need attention, how many can be safely repriced, how many are blocked by margin floor, and how many should be held. In the decision queue, lost Buy Box positions are treated as critical actions, while won positions with price headroom are treated as warnings, so the operator can work through the queue by urgency. I used a card-based layout instead of modals or sidebars so the recommendation, price context, margin floor, risk, tradeoff, and apply action stay visible together. This keeps the workflow action-oriented and avoids forcing the operator to inspect each SKU one at a time.

## Edge Case Handling

SKUs where the competitor is priced below our margin floor are marked as blocked. The app does not recommend matching or undercutting those prices because that would violate the margin guardrail.

Additional edge cases handled:

- If we are already winning the Buy Box and changed the price today, the SKU is held back so we do not keep repricing aggressively.
- If we are winning and already very close to the competitor, the SKU is held because there is not enough safe upside to justify another price move.
- If the AI returns a decision outside the safe price range, the app falls back to the deterministic guardrail recommendation.

## Build Check

```bash
pnpm build
```
