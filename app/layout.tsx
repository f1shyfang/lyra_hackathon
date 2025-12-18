import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "./components/Navigation";

export const metadata: Metadata = {
  title: "Lyra - Recruiting Signal Intelligence",
  description: "See who your words attract before you publish. Predict audience composition and recruiting risk for your LinkedIn posts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="pt-16 bg-black text-slate-100 min-h-screen">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-950/40 to-black" />
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl" />
        </div>
        <Navigation />
        {children}
      </body>
    </html>
  );
}

