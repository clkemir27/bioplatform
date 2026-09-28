"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SearchExperience from "./SearchExperience";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  return <SearchExperience key={query} query={query} />;
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f2f6f3] px-4 py-12 text-slate-600 sm:px-7">
          <div className="mx-auto max-w-7xl">Loading search...</div>
        </main>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
