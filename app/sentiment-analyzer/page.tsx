'use client';

import { useState } from 'react';

interface PredictionResult {
  prediction: string;
  confidence: number;
  probabilities: {
    positive: number;
    negative: number;
  };
  features_extracted: {
    text_length: number;
    emoji_count: number;
    url_count: number;
    hashtag_count: number;
    mention_count: number;
    embedding_dimension: number;
  };
  timestamp: string;
}

interface FormData {
  text: string;
  post_hour: number;
  post_day_of_week: number;
  post_month: number;
  has_media: number;
  media_count: number;
  media_type: string;
  post_type: string;
  author_follower_count: number;
}

const API_URL = 'http://localhost:8000';

const examples = {
  1: {
    text: "Excited to announce our new AI-powered analytics platform! This will transform how businesses understand their customers. Join us at the launch event next week! 🚀 #AI #Innovation #TechNews",
    has_media: 1,
    media_count: 1,
    media_type: "image"
  },
  2: {
    text: "We deeply regret the service outage that affected our customers yesterday. We take full responsibility and are implementing measures to prevent this from happening again. Your trust is our priority.",
    has_media: 0,
    media_count: 0,
    media_type: "none"
  },
  3: {
    text: "Proud to share that our team won the Best Workplace Award 2024! This achievement reflects our commitment to creating an inclusive and innovative environment. Thank you to everyone who made this possible! 🏆✨",
    has_media: 1,
    media_count: 2,
    media_type: "image"
  }
};

export default function SentimentAnalyzer() {
  const [formData, setFormData] = useState<FormData>({
    text: '',
    post_hour: 12,
    post_day_of_week: 2,
    post_month: 1,
    has_media: 0,
    media_count: 0,
    media_type: 'none',
    post_type: 'regular',
    author_follower_count: 1000
  });

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadExample = (num: 1 | 2 | 3) => {
    const example = examples[num];
    setFormData(prev => ({
      ...prev,
      text: example.text,
      has_media: example.has_media,
      media_count: example.media_count,
      media_type: example.media_type
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Prediction failed');
      }

      const data: PredictionResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0c1628] to-[#0a0f1c] text-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center text-slate-50 mb-12">
          <h1 className="text-5xl font-bold mb-3">
            LinkedIn PR Sentiment Analyzer
          </h1>
          <p className="text-xl opacity-80">
            Predict whether your LinkedIn post will generate positive or negative PR using AI
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-sky-200 mb-6 flex items-center gap-3">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Input Your LinkedIn Post
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Text Area */}
              <div>
                <label htmlFor="text" className="block mb-2 font-semibold text-slate-200">
                  Post Text *
                </label>
                <textarea
                  id="text"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="Enter your LinkedIn post text here..."
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/15 text-slate-50 placeholder:text-slate-400 rounded-xl focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30 outline-none transition-all min-h-[150px] resize-y"
                />
              </div>

              {/* Advanced Options Toggle */}
              <div
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-center text-sky-300 font-semibold cursor-pointer hover:underline"
              >
                ⚙️ Advanced Options (Optional) {showAdvanced ? '▲' : '▼'}
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                  <div>
                    <label className="block mb-2 font-semibold text-slate-200 text-sm">
                      Post Hour (0-23)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={formData.post_hour}
                      onChange={(e) => setFormData({ ...formData, post_hour: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/15 text-slate-50 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-semibold text-slate-200 text-sm">
                      Day of Week
                    </label>
                    <select
                      value={formData.post_day_of_week}
                      onChange={(e) => setFormData({ ...formData, post_day_of_week: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/15 text-slate-50 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 outline-none"
                    >
                      <option value="0">Monday</option>
                      <option value="1">Tuesday</option>
                      <option value="2">Wednesday</option>
                      <option value="3">Thursday</option>
                      <option value="4">Friday</option>
                      <option value="5">Saturday</option>
                      <option value="6">Sunday</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 font-semibold text-slate-200 text-sm">
                      Has Media?
                    </label>
                    <select
                      value={formData.has_media}
                      onChange={(e) => setFormData({ ...formData, has_media: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/15 text-slate-50 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 outline-none"
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 font-semibold text-slate-200 text-sm">
                      Media Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.media_count}
                      onChange={(e) => setFormData({ ...formData, media_count: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/15 text-slate-50 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-semibold text-slate-200 text-sm">
                      Media Type
                    </label>
                    <select
                      value={formData.media_type}
                      onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/15 text-slate-50 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 outline-none"
                    >
                      <option value="none">None</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 font-semibold text-slate-200 text-sm">
                      Post Type
                    </label>
                    <select
                      value={formData.post_type}
                      onChange={(e) => setFormData({ ...formData, post_type: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/15 text-slate-50 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 outline-none"
                    >
                      <option value="regular">Regular</option>
                      <option value="article">Article</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block mb-2 font-semibold text-slate-200 text-sm">
                      Follower Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.author_follower_count}
                      onChange={(e) => setFormData({ ...formData, author_follower_count: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/15 text-slate-50 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? '🔄 Analyzing...' : '🚀 Analyze Sentiment'}
              </button>
            </form>

            {/* Examples */}
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
              <h4 className="font-semibold text-sky-100 mb-3 text-sm">
                📝 Try Example Posts:
              </h4>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => loadExample(1)}
                  className="w-full text-left px-3 py-2 bg-white/5 text-slate-100 hover:bg-white/10 rounded-lg text-sm transition-all hover:translate-x-1"
                >
                  Positive: Product Launch Announcement
                </button>
                <button
                  type="button"
                  onClick={() => loadExample(2)}
                  className="w-full text-left px-3 py-2 bg-white/5 text-slate-100 hover:bg-white/10 rounded-lg text-sm transition-all hover:translate-x-1"
                >
                  Negative: Service Outage Apology
                </button>
                <button
                  type="button"
                  onClick={() => loadExample(3)}
                  className="w-full text-left px-3 py-2 bg-white/5 text-slate-100 hover:bg-white/10 rounded-lg text-sm transition-all hover:translate-x-1"
                >
                  Positive: Award Achievement
                </button>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-sky-200 mb-6 flex items-center gap-3">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Prediction Results
            </h2>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-white/20 border-t-sky-400 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-300">Analyzing your post...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-500/10 border border-red-400/60 text-red-100 rounded-xl p-4">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <div className="space-y-6 animate-fadeIn">
                {/* Prediction Badge */}
                <div>
                  <span
                    className={`inline-block px-6 py-3 rounded-full text-xl font-bold ${
                      result.prediction === 'positive'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-400 text-white'
                        : 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                    }`}
                  >
                    {result.prediction === 'positive' ? '✅ Positive PR' : '⚠️ Negative PR'}
                  </span>
                </div>

                {/* Confidence Bar */}
                <div>
                  <h3 className="font-bold text-slate-100 mb-2">Confidence Level</h3>
                  <div className="w-full h-10 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-end pr-4 text-white font-semibold transition-all duration-1000"
                      style={{ width: `${result.confidence * 100}%` }}
                    >
                      {(result.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Probabilities */}
                <div>
                  <h3 className="font-bold text-slate-100 mb-3">Probabilities</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-emerald-500/15 to-green-500/10 border border-emerald-300/40 rounded-xl text-center">
                      <div className="text-sm text-emerald-100 mb-1">Positive PR</div>
                      <div className="text-3xl font-bold text-emerald-200">
                        {(result.probabilities.positive * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-orange-300/40 rounded-xl text-center">
                      <div className="text-sm text-orange-100 mb-1">Negative PR</div>
                      <div className="text-3xl font-bold text-orange-200">
                        {(result.probabilities.negative * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="font-bold text-sky-200 mb-4">📊 Extracted Features</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                      <span className="text-sm text-slate-300">Text Length</span>
                      <span className="font-semibold text-slate-50">{result.features_extracted.text_length}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                      <span className="text-sm text-slate-300">Emoji Count</span>
                      <span className="font-semibold text-slate-50">{result.features_extracted.emoji_count}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                      <span className="text-sm text-slate-300">URL Count</span>
                      <span className="font-semibold text-slate-50">{result.features_extracted.url_count}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                      <span className="text-sm text-slate-300">Hashtag Count</span>
                      <span className="font-semibold text-slate-50">{result.features_extracted.hashtag_count}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                      <span className="text-sm text-slate-300">Mention Count</span>
                      <span className="font-semibold text-slate-50">{result.features_extracted.mention_count}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3">
                      <span className="text-sm text-slate-300">Embedding Dim</span>
                      <span className="font-semibold text-slate-50">{result.features_extracted.embedding_dimension}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!result && !loading && !error && (
              <div className="text-center py-12 text-slate-400">
                <svg className="w-20 h-20 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>Enter a post and click analyze to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

