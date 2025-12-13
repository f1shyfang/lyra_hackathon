import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Next.js + Supabase
        </h1>
        <p className="text-center mb-8 text-lg">
          Welcome to your Next.js application with Supabase integration
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/examples/database"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Database Examples
          </Link>
          <Link
            href="/examples/storage"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Storage Examples
          </Link>
          <Link
            href="/examples/ai-personas"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            AI Personas
          </Link>
        </div>
      </div>
    </main>
  );
}

