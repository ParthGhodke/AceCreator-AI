import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AceCreator AI — Instagram Creator Intelligence & Content Studio",
  description:
    "AceCreator AI is an Instagram-first creative operating system for sharper content, smarter strategy, and evidence-led growth.",
  applicationName: "AceCreator AI",
  keywords: ["Instagram growth", "creator strategy", "content studio", "creator analytics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-[#2563EB] selection:text-white">
        {children}
      </body>
    </html>
  );
}
