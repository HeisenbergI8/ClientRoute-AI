# ClientRoute AI

> AI-powered enquiry classification and response assistant for Strata Management Consultants.

## Overview

ClientRoute AI automates the triage and initial response generation for incoming client enquiries. Staff submit enquiries through a web interface; the AI returns a structured classification with confidence scoring, a suggested client response, and a recommended staff action — eliminating manual routing and reducing first-response time.

**Core workflow**: Web form → Zod validation → OpenAI classification → Structured result → Staff action

## Quick Start

```bash
npm install
cp .env.example .env.local   # Add your OPENAI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and use the **Try an example** presets to test each enquiry type immediately.

## Environment Variables

| Variable         | Required | Description                             |
| ---------------- | -------- | --------------------------------------- |
| `OPENAI_API_KEY` | Yes      | OpenAI API key — platform.openai.com    |
| `OPENAI_MODEL`   | No       | Override model (default: `gpt-4o-mini`) |

## Enquiry Types

| Type                 | Description                              |
| -------------------- | ---------------------------------------- |
| New Client           | First-time contact, onboarding inquiries |
| Support Request      | Existing client operational help         |
| Complaint            | Dissatisfaction or negative experience   |
| Billing Question     | Invoice, payment, financial queries      |
| General Enquiry      | Miscellaneous informational questions    |
| Escalation           | Urgent, legal, or regulatory matters     |
| Spam / Invalid Input | Nonsense or irrelevant content           |

## Commands

```bash
npm run dev            # Development server (localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm run type-check     # TypeScript strict check (tsc --noEmit)
npm test               # Jest test suite
npm run test:coverage  # Coverage report
```

## Architecture

```
src/
├── app/
│   ├── api/classify/route.ts      # POST endpoint — validates input, calls AI
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── EnquiryForm.tsx            # Form, presets, state management
│   └── ClassificationResult.tsx   # Result card, confidence bar, copy button
├── lib/
│   ├── ai/
│   │   ├── classify.ts            # classifyEnquiry() — retry + fallback logic
│   │   └── prompts.ts             # SYSTEM_PROMPT + buildUserPrompt()
│   └── validation/
│       └── schemas.ts             # Zod: EnquiryInputSchema + ClassificationResultSchema
├── middleware.ts                  # Per-IP rate limiting (10 req / 60s)
├── types/
│   └── enquiry.ts                 # Canonical TypeScript types
└── __tests__/
    ├── schemas.test.ts            # 11 Zod validation tests
    └── classify.test.ts           # 6 AI service + fallback tests
```

## AI Workflow

```
EnquiryForm → POST /api/classify → Zod validate input
  → classifyEnquiry() → OpenAI GPT-4o-mini (temp: 0.1)
  → JSON.parse() → ClassificationResultSchema.safeParse()
  → success: return data | failure: retry (×2, 500ms backoff) → FALLBACK_CLASSIFICATION
```

---

## Prompt Engineering

### Temperature: 0.1

The system uses `temperature: 0.1` — the lowest practical non-zero setting. Enquiry classification is a deterministic task: the same message should always produce the same type. Higher temperature introduces randomness that is actively harmful here (the same complaint shouldn't sometimes classify as a "Support Request"). `0.1` retains minimal variation to handle genuinely ambiguous inputs without introducing instability.

### `response_format: json_object`

OpenAI's `json_object` response format is enforced rather than prompting the model to "respond in JSON". This has two effects:

1. The model cannot wrap output in markdown code fences (a common failure mode that breaks `JSON.parse()`)
2. The model is constrained to produce syntactically valid JSON in all cases

The prompt still documents the exact schema inline — the response format guarantees syntax, but the prompt constrains semantics (field names, value ranges, enum membership).

### Schema Documented Inside the System Prompt

The full JSON schema is embedded in the system prompt itself:

```json
{
  "enquiryType": "<exact type string from list above>",
  "confidenceScore": "<integer 0–100>",
  "suggestedResponse": "<professional client-facing response draft>",
  "recommendedAction": "<specific action for the staff member>",
  "isLowConfidence": "<boolean>",
  "requiresEscalation": "<boolean>"
}
```

This approach — documenting the schema in natural language AND as a JSON example — achieves significantly lower hallucination rates on field names than function-calling or schema-only approaches, because the model sees both the structural constraint and the semantic description together.

### Confidence Tiers

Confidence scoring is defined with explicit tiers in the prompt to force the model to reason about uncertainty rather than defaulting to high scores:

| Score  | Meaning                                        |
| ------ | ---------------------------------------------- |
| 90–100 | Crystal clear intent, unambiguous category     |
| 70–89  | Strong signal, minor ambiguity resolved        |
| 50–69  | Multiple possible categories, best-fit applied |
| 30–49  | Vague or ambiguous — human review recommended  |
| 0–29   | Cannot meaningfully classify — flag for triage |

These tiers feed directly into the UI: scores below 60 display an amber "Low Confidence — Manual Review Required" badge; scores below 40 (or type `"Escalation"`) trigger a red `ESCALATE` badge and set `requiresEscalation: true`.

### Escalation Logic

Two conditions independently trigger escalation:

1. `enquiryType === "Escalation"` — the content explicitly signals urgency (legal threats, regulatory complaints, media inquiries)
2. `confidenceScore < 40` — the AI is too uncertain to route automatically; human review is safer than a wrong classification

This dual-trigger design means genuinely urgent messages are never silently low-priority, and genuinely ambiguous messages are never auto-routed without review.

---

## Design Decisions

### Server-Only AI Calls

The OpenAI API is called exclusively from `src/lib/ai/classify.ts`, which is imported only by the API route (`src/app/api/classify/route.ts`). Client-side components communicate via `fetch("/api/classify")`. The `OPENAI_API_KEY` is never accessible in the browser bundle — a hard security requirement.

### Double Zod Validation Boundary

Input is validated by `EnquiryInputSchema` at the API boundary before any AI call. The AI's response JSON is separately validated by `ClassificationResultSchema` before being returned to the client. This matters because:

- Input validation prevents oversized or malformed data reaching the AI
- Output validation means a hallucinated or malformed AI response can never reach the frontend as trusted data

Both schemas use `.safeParse()` — never `.parse()` — so validation failures are handled gracefully rather than throwing.

### Retry + Exponential Backoff → FALLBACK_CLASSIFICATION

`classifyEnquiry()` retries up to 2 times with 500ms / 1000ms exponential backoff before activating `FALLBACK_CLASSIFICATION`. The fallback returns a `confidenceScore: 0` result with a `warning` field that surfaces an amber banner in the UI. The UI **always** renders — the system never returns a blank screen on AI failure.

### Lazy OpenAI Client Initialisation

The `OpenAI` client is instantiated once on first use (`getOpenAI()`), not at module load time. This avoids errors during build-time static analysis when `OPENAI_API_KEY` is not yet in the environment.

---

## Error Handling

| Scenario                     | Behaviour                                                                |
| ---------------------------- | ------------------------------------------------------------------------ |
| Vague / ambiguous message    | Low confidence score (< 60) → amber badge + "Manual Review Required"     |
| Spam / gibberish input       | Classified as `"Spam / Invalid Input"` with high confidence              |
| Input too short (< 10 chars) | Zod rejects at API boundary → 422 with field-level errors                |
| Malformed JSON from AI       | Caught, retry attempted → fallback on all retries exhausted              |
| AI schema validation failure | Same retry + fallback path as malformed JSON                             |
| OpenAI API timeout / 5xx     | Retry with backoff → fallback with warning banner in UI                  |
| Rate limit exceeded (429)    | Middleware returns 429 + `Retry-After` header → UI displays wait message |
| Missing API key              | OpenAI SDK throws at first call → caught by retry → fallback activated   |

---

## Automation Potential

The `/api/classify` endpoint is the integration point for upstream and downstream automation:

**Email Integration**

- Attach a webhook listener (Mailgun, SendGrid Inbound Parse, or Gmail API) that POSTs incoming emails to `/api/classify`
- `recommendedAction` drives automatic routing to a staff inbox or ticket system

**CRM Integration**

- After classification, POST the result to Salesforce, HubSpot, or Zoho CRM
- `enquiryType` maps to a pipeline stage; `requiresEscalation` triggers a high-priority flag

**Task Queue / Async Processing**

- Publish `ClassificationResult` to a Redis queue (BullMQ) or AWS SQS
- Staff notification service consumes the queue and sends Slack/Teams alerts for escalations

**No-Code Automation (n8n / Zapier)**

- Expose classification as an n8n HTTP node trigger
- Downstream nodes: create Trello card, send email, update spreadsheet, notify Slack channel

**Rate Limiting — Production Note**

The current rate limiter uses an in-memory `Map` (10 requests / 60 seconds per IP). This works correctly for single-instance deployments. For multi-instance production, replace with [Upstash Redis](https://upstash.com/) + `@upstash/ratelimit`:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
});
```

---

## Tech Stack

| Layer      | Technology              |
| ---------- | ----------------------- |
| Framework  | Next.js 15 (App Router) |
| Language   | TypeScript (strict)     |
| Styling    | Tailwind CSS 3          |
| AI         | OpenAI GPT-4o-mini      |
| Validation | Zod 3                   |
| Testing    | Jest + ts-jest          |
