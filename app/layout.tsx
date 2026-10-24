
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpinionHub - Share Your Opinions",
  description:
    "Explore polls, share your opinions, and see what others think on OpinionHub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
