import {
  EnquiryInputSchema,
  ClassificationResultSchema,
} from "@/lib/validation/schemas";

describe("EnquiryInputSchema", () => {
  it("accepts valid input", () => {
    const result = EnquiryInputSchema.safeParse({
      name: "Sarah Johnson",
      email: "sarah@example.com",
      message:
        "I would like to know more about selling my strata management business.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name under 2 characters", () => {
    const result = EnquiryInputSchema.safeParse({
      name: "A",
      email: "a@example.com",
      message: "Valid message content here",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    }
  });

  it("rejects invalid email", () => {
    const result = EnquiryInputSchema.safeParse({
      name: "Sarah",
      email: "not-an-email",
      message: "Valid message content here",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it("rejects message under 10 characters", () => {
    const result = EnquiryInputSchema.safeParse({
      name: "Sarah",
      email: "sarah@example.com",
      message: "Short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toBeDefined();
    }
  });

  it("trims whitespace from name and message", () => {
    const result = EnquiryInputSchema.safeParse({
      name: "  Sarah Johnson  ",
      email: "sarah@example.com",
      message: "  I have a question about selling my strata business.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Sarah Johnson");
      expect(result.data.message).toBe(
        "I have a question about selling my strata business.",
      );
    }
  });
});

describe("ClassificationResultSchema", () => {
  const validResult = {
    enquiryType: "Sell Inquiry",
    confidenceScore: 85,
    suggestedResponse:
      "Thank you for your enquiry about selling your strata management business.",
    recommendedAction:
      "Contact the client to schedule an initial consultation.",
    isLowConfidence: false,
    requiresEscalation: false,
  };

  it("accepts valid classification result", () => {
    expect(ClassificationResultSchema.safeParse(validResult).success).toBe(
      true,
    );
  });

  it("rejects unknown enquiry type", () => {
    const result = ClassificationResultSchema.safeParse({
      ...validResult,
      enquiryType: "Unknown Type",
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence score above 100", () => {
    const result = ClassificationResultSchema.safeParse({
      ...validResult,
      confidenceScore: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer confidence score", () => {
    const result = ClassificationResultSchema.safeParse({
      ...validResult,
      confidenceScore: 85.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { suggestedResponse: _omitted, ...partial } = validResult;
    expect(ClassificationResultSchema.safeParse(partial).success).toBe(false);
  });
});
