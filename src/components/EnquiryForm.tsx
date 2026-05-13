"use client";

import { useState } from "react";
import type { ClassificationApiResponse } from "@/types/enquiry";
import ClassificationResult from "./ClassificationResult";

interface FormFields {
  name: string;
  email: string;
  message: string;
}

const EMPTY_FORM: FormFields = { name: "", email: "", message: "" };

const EXAMPLE_ENQUIRIES: Array<{ label: string } & FormFields> = [
  {
    label: "New Client",
    name: "Emily Chen",
    email: "emily.chen@example.com",
    message:
      "Hi, I recently purchased a unit at Riverside Gardens and I'm looking to engage your firm for strata management services. Could you please let me know about your management packages and fees?",
  },
  {
    label: "Complaint",
    name: "Marcus Webb",
    email: "m.webb@example.com",
    message:
      "I'm extremely frustrated with the ongoing noise issues from the unit above me. I've raised this multiple times over the past three months and nothing has been done. This is completely unacceptable and I need this resolved immediately.",
  },
  {
    label: "Billing Question",
    name: "Sandra Liu",
    email: "sandra.liu@example.com",
    message:
      "I received my quarterly levy notice for $1,840 but it's significantly higher than last quarter. Could you please explain the increase and provide a breakdown of the additional charges?",
  },
  {
    label: "Escalation",
    name: "Robert Hastings",
    email: "r.hastings@example.com",
    message:
      "Our building has had water ingress for over six months causing significant damage to multiple units. We have engaged a solicitor and will be seeking legal action unless emergency repairs are completed within 7 days. This is your formal notice.",
  },
];

export default function EnquiryForm() {
  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [result, setResult] = useState<ClassificationApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  function updateField(field: keyof FormFields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function loadExample(example: (typeof EXAMPLE_ENQUIRIES)[number]) {
    setForm({
      name: example.name,
      email: example.email,
      message: example.message,
    });
    setResult(null);
    setNetworkError(null);
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setResult(null);
    setNetworkError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setNetworkError(null);
    setResult(null);

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const seconds = retryAfter ? ` Please wait ${retryAfter} seconds.` : "";
        setNetworkError(`Too many requests.${seconds} Try again shortly.`);
        return;
      }

      const data: ClassificationApiResponse = await response.json();
      setResult(data);
    } catch {
      setNetworkError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-colors";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ── Left column: presets + form + error ── */}
      <div className="space-y-6">
        {/* Example presets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Try an example
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_ENQUIRIES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => loadExample(example)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Enquiry Form ── */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5"
          aria-label="Enquiry submission form"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Submit Enquiry
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Describe the enquiry and our AI will classify and suggest a
              response.
            </p>
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Client Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={updateField("name")}
              className={inputClass}
              placeholder="e.g. Sarah Johnson"
              required
              minLength={2}
              maxLength={100}
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField("email")}
              className={inputClass}
              placeholder="e.g. sarah@example.com"
              required
              maxLength={254}
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Enquiry Message
            </label>
            <textarea
              id="message"
              value={form.message}
              onChange={updateField("message")}
              rows={5}
              className={`${inputClass} resize-none`}
              placeholder="Describe the enquiry in detail..."
              required
              minLength={10}
              maxLength={2000}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.message.length}/2000
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Classifying…
              </span>
            ) : (
              "Classify Enquiry"
            )}
          </button>
        </form>

        {/* ── Network Error ── */}
        {networkError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {networkError}
          </div>
        )}
      </div>

      {/* ── Right column: result panel ── */}
      <div>
        {result ? (
          <ClassificationResult result={result} onReset={handleReset} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-dashed p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
            <svg
              className="w-8 h-8 text-gray-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-400">
              Classification result will appear here
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Submit an enquiry to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
