"use client";

import { useState } from "react";
import type {
  ClassificationApiResponse,
  ClassificationResult as ClassData,
} from "@/types/enquiry";

// ─── Colour Utilities ─────────────────────────────────────────────────────────

function confidenceColour(score: number): string {
  if (score >= 80) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function confidenceLabel(score: number): string {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  if (score >= 40) return "Low";
  return "Very Low";
}

const TYPE_BADGE: Record<string, string> = {
  "New Client": "bg-blue-100 text-blue-800 border-blue-200",
  "Support Request": "bg-purple-100 text-purple-800 border-purple-200",
  Complaint: "bg-orange-100 text-orange-800 border-orange-200",
  "Billing Question": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "General Enquiry": "bg-gray-100 text-gray-700 border-gray-200",
  Escalation: "bg-red-100 text-red-800 border-red-200",
  "Spam / Invalid Input": "bg-gray-100 text-gray-500 border-gray-200",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silent fail
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
      aria-label="Copy suggested response to clipboard"
    >
      {copied ? (
        <>
          <svg
            className="w-3.5 h-3.5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-green-600">Copied</span>
        </>
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const colour = confidenceColour(score);
  return (
    <div className={`rounded-lg border px-4 py-3 ${colour}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide">
          Confidence — {confidenceLabel(score)}
        </span>
        <span className="text-xl font-bold tabular-nums">{score}/100</span>
      </div>
      <div className="w-full bg-current/20 rounded-full h-2">
        <div
          className="bg-current h-2 rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function ResponseBlock({
  label,
  content,
  variant = "neutral",
  copyable = false,
}: {
  label: string;
  content: string;
  variant?: "neutral" | "action";
  copyable?: boolean;
}) {
  const bg =
    variant === "action"
      ? "bg-blue-50 border-blue-100"
      : "bg-gray-50 border-gray-200";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        {copyable && <CopyButton text={content} />}
      </div>
      <p
        className={`text-sm text-gray-700 rounded-lg border p-3 leading-relaxed ${bg}`}
      >
        {content}
      </p>
    </div>
  );
}

// ─── Success Display ──────────────────────────────────────────────────────────

function ClassificationSuccess({
  data,
  warning,
  onReset,
}: {
  data: ClassData;
  warning?: string;
  onReset: () => void;
}) {
  const typeBadge =
    TYPE_BADGE[data.enquiryType] ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5"
      role="region"
      aria-label="Classification result"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900">
          Classification Result
        </h2>
        {warning && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-3 py-1">
            ⚠ AI unavailable — fallback used
          </span>
        )}
      </div>

      {/* Type + Escalation Badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <span
          className={`text-sm font-semibold px-3 py-1 rounded-full border ${typeBadge}`}
        >
          {data.enquiryType}
        </span>
        {data.requiresEscalation && (
          <span className="text-xs font-bold bg-red-600 text-white rounded-full px-3 py-1">
            ESCALATE
          </span>
        )}
        {data.isLowConfidence && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5">
            Low Confidence — Manual Review Required
          </span>
        )}
      </div>

      {/* Confidence Bar */}
      <ConfidenceBar score={data.confidenceScore} />

      {/* Response + Action */}
      {data.enquiryType === "Spam / Invalid Input" ? (
        <ResponseBlock
          label="Client Response"
          content={data.suggestedResponse}
        />
      ) : (
        <ResponseBlock
          label="Suggested Client Response"
          content={data.suggestedResponse}
          copyable
        />
      )}
      <ResponseBlock
        label="Recommended Staff Action"
        content={data.recommendedAction}
        variant="action"
      />

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
      >
        Classify Another Enquiry
      </button>
    </div>
  );
}

// ─── Error Display ────────────────────────────────────────────────────────────

function ClassificationFailure({
  error,
  onReset,
}: {
  error: string | Record<string, string[]>;
  onReset: () => void;
}) {
  const message =
    typeof error === "string"
      ? error
      : Object.entries(error)
          .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
          .join(" · ");

  return (
    <div
      role="alert"
      className="rounded-xl bg-red-50 border border-red-200 p-6 space-y-4"
    >
      <div>
        <h3 className="font-semibold text-red-800 mb-1">
          Classification Failed
        </h3>
        <p className="text-sm text-red-600">{message}</p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-sm font-medium text-red-700 hover:text-red-900 underline underline-offset-2"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
  result: ClassificationApiResponse;
  onReset: () => void;
}

export default function ClassificationResult({ result, onReset }: Props) {
  if (!result.success) {
    return <ClassificationFailure error={result.error} onReset={onReset} />;
  }
  return (
    <ClassificationSuccess
      data={result.data}
      warning={result.warning}
      onReset={onReset}
    />
  );
}
