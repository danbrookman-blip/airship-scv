import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

// Airship renders nav/headings in Lato. (Page titles use the licensed DIN-2014,
// which we name first in the display stack and fall back to Lato.)
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Single Customer View · Airship",
  description: "Segment-level customer value and demographics, rolled up in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={lato.variable}>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
