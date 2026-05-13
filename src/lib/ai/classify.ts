import OpenAI from "openai";
import { ClassificationResultSchema } from "@/lib/validation/schemas";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import type { EnquiryInput, ClassificationResult } from "@/types/enquiry";

// ─── OpenAI Client ────────────────────────────────────────────────────────────
// Lazily instantiated — only created when classifyEnquiry() is called at runtime.
// This prevents build failures when OPENAI_API_KEY is not set at build time.

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _openai;
}

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// ─── Fallback Classification ──────────────────────────────────────────────────
// Used when all retry attempts fail. Ensures the UI always has something to display.

export const FALLBACK_CLASSIFICATION: ClassificationResult = {
  enquiryType: "General Enquiry",
  confidenceScore: 0,
  suggestedResponse:
    "Thank you for your enquiry. A member of our team will review your message and be in touch shortly.",
  recommendedAction:
    "AI classification unavailable. Review this enquiry manually and assign to the appropriate team member.",
  isLowConfidence: true,
  requiresEscalation: false,
};

// ─── Single Classification Attempt ───────────────────────────────────────────

async function attemptClassification(
  input: EnquiryInput,
): Promise<ClassificationResult> {
  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    temperature: 0.1, // deterministic — do not raise above 0.3 for classification
    max_tokens: 512,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error("AI provider returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`AI returned malformed JSON: ${raw.substring(0, 150)}`);
  }

  const result = ClassificationResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `AI response failed schema validation: ${result.error.message}`,
    );
  }

  return result.data;
}

// ─── Public Classification Service ───────────────────────────────────────────
// Wraps attemptClassification with exponential backoff and guaranteed fallback.

export async function classifyEnquiry(
  input: EnquiryInput,
  maxRetries = 2,
): Promise<{ data: ClassificationResult; usedFallback: boolean }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await attemptClassification(input);
      return { data, usedFallback: false };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, ...
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  console.error("[classifyEnquiry] All attempts failed. Using fallback.", {
    error: lastError?.message,
    attempts: maxRetries,
  });

  return { data: FALLBACK_CLASSIFICATION, usedFallback: true };
}
