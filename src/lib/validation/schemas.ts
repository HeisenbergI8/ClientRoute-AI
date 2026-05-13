import { z } from "zod";

// ─── Enquiry Type Taxonomy ────────────────────────────────────────────────────

export const EnquiryTypeSchema = z.enum([
  "New Client",
  "Support Request",
  "Complaint",
  "Billing Question",
  "General Enquiry",
  "Escalation",
  "Spam / Invalid Input",
]);

// ─── Input Validation ─────────────────────────────────────────────────────────

export const EnquiryInputSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(254, "Email address is too long")
    .toLowerCase(),
  message: z
    .string()
    .min(10, "Enquiry must be at least 10 characters")
    .max(2000, "Enquiry must be under 2000 characters")
    .trim(),
});

// ─── AI Response Validation ───────────────────────────────────────────────────
// Every field is required — safeParse() gates the AI output before use

export const ClassificationResultSchema = z.object({
  enquiryType: EnquiryTypeSchema,
  confidenceScore: z.number().int().min(0).max(100),
  suggestedResponse: z.string().min(1).max(1500),
  recommendedAction: z.string().min(1).max(500),
  isLowConfidence: z.boolean(),
  requiresEscalation: z.boolean(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type EnquiryInput = z.infer<typeof EnquiryInputSchema>;
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;
export type EnquiryType = z.infer<typeof EnquiryTypeSchema>;
