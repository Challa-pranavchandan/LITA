"use client";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink">
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-serif">Something went wrong</h1>
          <p className="mt-3 text-sm text-graphite">An unexpected server error occurred.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-none bg-ink px-6 py-2.5 text-xs uppercase tracking-widest text-paper hover:bg-ink/90 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
