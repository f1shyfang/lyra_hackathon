import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LinkedIn PR Sentiment Analyzer - AI-Powered Post Analysis",
  description: "Predict whether your LinkedIn post will generate positive or negative PR using AI-powered sentiment analysis with Gemini embeddings and XGBoost",
  keywords: ["LinkedIn", "PR", "Sentiment Analysis", "AI", "Machine Learning", "XGBoost", "Gemini"],
};

export default function SentimentAnalyzerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

