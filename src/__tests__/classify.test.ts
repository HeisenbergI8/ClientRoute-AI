import { classifyEnquiry, FALLBACK_CLASSIFICATION } from "@/lib/ai/classify";
import type { EnquiryInput } from "@/types/enquiry";

// Mock OpenAI to avoid real API calls in tests
// jest.mock is hoisted, so mockCreate must be declared with var (not const/let) to be reachable
// eslint-disable-next-line no-var
var mockCreate: jest.Mock;

jest.mock("openai", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mockCreate = jest.fn();
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

beforeEach(() => {
  jest.clearAllMocks();
});

const VALID_INPUT: EnquiryInput = {
  name: "Sarah Johnson",
  email: "sarah@example.com",
  message:
    "I own a strata management company with 800 lots and I'm considering selling. What's the process?",
};

const VALID_AI_RESPONSE = {
  enquiryType: "Sell Inquiry",
  confidenceScore: 88,
  suggestedResponse:
    "Thank you for reaching out about selling your strata management business.",
  recommendedAction:
    "Schedule an initial confidential consultation with the client.",
  isLowConfidence: false,
  requiresEscalation: false,
};

describe("classifyEnquiry", () => {
  it("returns classification data on success", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(VALID_AI_RESPONSE) } }],
    });

    const { data, usedFallback } = await classifyEnquiry(VALID_INPUT);

    expect(usedFallback).toBe(false);
    expect(data.enquiryType).toBe("Sell Inquiry");
    expect(data.confidenceScore).toBe(88);
  });

  it("returns fallback when AI returns empty response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const { data, usedFallback } = await classifyEnquiry(VALID_INPUT, 1);

    expect(usedFallback).toBe(true);
    expect(data).toEqual(FALLBACK_CLASSIFICATION);
  });

  it("returns fallback when AI returns malformed JSON", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "not json {{{" } }],
    });

    const { data, usedFallback } = await classifyEnquiry(VALID_INPUT, 1);

    expect(usedFallback).toBe(true);
    expect(data.isLowConfidence).toBe(true);
  });

  it("returns fallback when AI returns invalid schema", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              enquiryType: "Unknown",
              confidenceScore: 999,
            }),
          },
        },
      ],
    });

    const { data, usedFallback } = await classifyEnquiry(VALID_INPUT, 1);

    expect(usedFallback).toBe(true);
  });

  it("retries on failure and succeeds on second attempt", async () => {
    mockCreate
      .mockRejectedValueOnce(new Error("Temporary network error"))
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(VALID_AI_RESPONSE) } }],
      });

    const { data, usedFallback } = await classifyEnquiry(VALID_INPUT, 2);

    expect(usedFallback).toBe(false);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(data.enquiryType).toBe("Sell Inquiry");
  });

  it("fallback has confidenceScore of 0", () => {
    expect(FALLBACK_CLASSIFICATION.confidenceScore).toBe(0);
    expect(FALLBACK_CLASSIFICATION.isLowConfidence).toBe(true);
  });
});
