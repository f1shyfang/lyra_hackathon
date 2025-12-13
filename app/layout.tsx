import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js + Supabase",
  description: "Next.js application with Supabase integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

