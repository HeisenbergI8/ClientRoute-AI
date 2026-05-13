import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClientRoute AI — Strata Enquiry Classification",
  description:
    "AI-powered enquiry classification and response assistant for Strata Management Consultants.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
