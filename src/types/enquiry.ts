// Canonical enquiry type taxonomy — used by AI, Zod, and UI
export type EnquiryType =
  | "Sell Inquiry"
  | "Buy Inquiry"
  | "Valuation Request"
  | "Process / Fees Enquiry"
  | "Out of Scope"
  | "General Enquiry"
  | "Escalation"
  | "Spam / Invalid Input";

export interface EnquiryInput {
  name: string;
  email: string;
  message: string;
}

export interface ClassificationResult {
  enquiryType: EnquiryType;
  /** 0–100 integer. Below 60 = low confidence, below 40 = requires escalation review */
  confidenceScore: number;
  /** Professional response draft addressed to the client */
  suggestedResponse: string;
  /** Concrete next step for the staff member handling this enquiry */
  recommendedAction: string;
  isLowConfidence: boolean;
  requiresEscalation: boolean;
}

export interface ClassificationSuccess {
  success: true;
  data: ClassificationResult;
  /** Present when AI service failed and fallback was used */
  warning?: string;
}

export interface ClassificationError {
  success: false;
  error: string | Record<string, string[]>;
}

export type ClassificationApiResponse =
  | ClassificationSuccess
  | ClassificationError;
