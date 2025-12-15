import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amplify - AI-Powered LinkedIn Content Optimization",
  description: "Optimize your LinkedIn content with AI-powered persona critiques, quality scoring, and A/B testing",
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

