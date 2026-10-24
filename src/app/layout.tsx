import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AceCreator AI — Instagram Creator Intelligence & Content Studio",
  description:
    "Instagram-first AI creator management platform for musicians, photographers, filmmakers, designers, and independent creators.",
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