import EnquiryForm from "@/components/EnquiryForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ClientRoute AI</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Strata Management Enquiry Classification
            </p>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 font-medium">
            AI Powered
          </span>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">New Enquiry</h2>
          <p className="text-sm text-gray-500 mt-1">
            Submit a client enquiry to receive an instant AI classification,
            confidence score, and recommended response.
          </p>
        </div>

        <EnquiryForm />
      </div>
    </main>
  );
}
