"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type {
  BioDoi,
  BioGene,
  BioProtein,
  BioPublication,
  BioStructure,
} from "@/app/lib/bio-types";

type SearchResponse = {
  query?: string;
  sources?: {
    ncbi?: BioGene | null;
    uniprot?: BioProtein | null;
    pubmed?: BioPublication[];
    pdb?: BioStructure[];
    doi?: BioDoi | null;
  };
  error?: string;
};

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query) {
      return;
    }

    const controller = new AbortController();

    async function search() {
      try {
        setError("");

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          }
        );

        const result: SearchResponse = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Search failed");
        }

        setData(result);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        console.error("Search error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong"
        );
      }
    }

    search();

    return () => {
      controller.abort();
    };
  }, [query]);

  function getResolution(resolution: BioStructure["resolution"]) {
    if (resolution === null) {
      return "—";
    }

    return `${resolution} Å`;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">

        <Link
          href="/"
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          ← Back to BioPlatform
        </Link>

        <h1 className="mt-8 text-4xl font-bold">
          Search results
        </h1>

        <p className="mt-3 text-slate-400">
          Showing results for:
        </p>

        <div className="mt-2 inline-block rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-lg text-cyan-300">
          {query}
        </div>

        {!query && (
          <p className="mt-10 text-slate-400">
            Please enter a search query.
          </p>
        )}

        {query && !data && !error && (
          <p className="mt-10 text-slate-400">
            Searching biological databases...
          </p>
        )}

        {error && !data && (
          <div className="mt-10 rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-red-300">
            {error}
          </div>
        )}

        {data && (
          <div className="mt-10 space-y-6">

            {/* NCBI + UniProt */}

            <div className="grid gap-6 lg:grid-cols-2">

              {/* NCBI */}

              {data.sources?.ncbi && (
                <section className="rounded-2xl border border-white/10 bg-white/5 p-8">

                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">
                      NCBI Gene
                    </h2>

                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                      NCBI
                    </span>
                  </div>

                  <div className="mt-8">
                    <p className="text-sm text-slate-400">
                      Gene Symbol
                    </p>

                    <p className="mt-2 text-4xl font-bold text-cyan-400">
                      {data.sources.ncbi.symbol}
                    </p>
                  </div>

                  <div className="mt-8 border-t border-white/10 pt-6">
                    <p className="text-sm text-slate-400">
                      Gene Name
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {data.sources.ncbi.name}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">

                    <div>
                      <p className="text-sm text-slate-400">
                        NCBI Gene ID
                      </p>

                      <p className="mt-2 font-semibold">
                        {data.sources.ncbi.id}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400">
                        Organism
                      </p>

                      <p className="mt-2 font-semibold">
                        {data.sources.ncbi.organism}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400">
                        Gene Type
                      </p>

                      <p className="mt-2 font-semibold">
                        {data.sources.ncbi.geneType}
                      </p>
                    </div>

                  </div>
                </section>
              )}

              {/* UniProt */}

              {data.sources?.uniprot && (
                <section className="rounded-2xl border border-white/10 bg-white/5 p-8">

                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">
                      UniProt
                    </h2>

                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                      Reviewed
                    </span>
                  </div>

                  <div className="mt-8">
                    <p className="text-sm text-slate-400">
                      Protein
                    </p>

                    <p className="mt-2 text-3xl font-bold text-emerald-400">
                      {data.sources.uniprot.proteinName}
                    </p>
                  </div>

                  <div className="mt-8 border-t border-white/10 pt-6">
                    <p className="text-sm text-slate-400">
                      UniProt Accession
                    </p>

                    <p className="mt-2 text-2xl font-semibold">
                      {data.sources.uniprot.accession}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">

                    <div>
                      <p className="text-sm text-slate-400">
                        UniProt ID
                      </p>

                      <p className="mt-2 font-semibold">
                        {data.sources.uniprot.id}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400">
                        Organism
                      </p>

                      <p className="mt-2 font-semibold">
                        {data.sources.uniprot.organism}
                      </p>
                    </div>

                  </div>

                  <div className="mt-6">
                    <p className="text-sm text-slate-400">
                      Entry Type
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      {data.sources.uniprot.entryType}
                    </p>
                  </div>

                </section>
              )}

            </div>

            {/* PubMed */}

            {data.sources?.pubmed &&
              data.sources.pubmed.length > 0 && (
                <section className="rounded-2xl border border-white/10 bg-white/5 p-8">

                  <div className="flex items-center justify-between">

                    <div>
                      <h2 className="text-2xl font-semibold">
                        PubMed
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Recent publications related to {query}
                      </p>
                    </div>

                    <span className="rounded-full bg-purple-400/10 px-3 py-1 text-xs text-purple-300">
                      {data.sources.pubmed.length} articles
                    </span>

                  </div>

                  <div className="mt-6 space-y-4">

                    {data.sources.pubmed.map((article) => (
                      <article
                        key={article.pmid}
                        className="rounded-xl border border-white/10 bg-slate-900/50 p-5 transition hover:border-purple-400/30"
                      >

                        <h3 className="text-lg font-semibold leading-7">
                          {article.title}
                        </h3>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">

                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-300 hover:text-purple-200 hover:underline"
                          >
                            PMID: {article.pmid}
                          </a>

                          <span>
                            Published:{" "}
                            <span className="text-slate-300">
                              {article.pubDate}
                            </span>
                          </span>

                        </div>

                      </article>
                    ))}

                  </div>

                </section>
              )}

            {/* Crossref DOI */}

            {data.sources?.doi && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Crossref</h2>
                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                    DOI
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-semibold">
                  {data.sources.doi.title || "Untitled work"}
                </h3>

                <a
                  href={data.sources.doi.url || `https://doi.org/${data.sources.doi.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-cyan-300 hover:text-cyan-200 hover:underline"
                >
                  {data.sources.doi.doi}
                </a>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                  {data.sources.doi.journal && (
                    <span>{data.sources.doi.journal}</span>
                  )}
                  {data.sources.doi.publisher && (
                    <span>{data.sources.doi.publisher}</span>
                  )}
                  {data.sources.doi.published && (
                    <span>
                      Published: {data.sources.doi.published.join("-")}
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* RCSB PDB */}

            {data.sources?.pdb &&
              data.sources.pdb.length > 0 && (
                <section className="rounded-2xl border border-white/10 bg-white/5 p-8">

                  <div className="flex items-center justify-between">

                    <div>
                      <h2 className="text-2xl font-semibold">
                        RCSB PDB
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Protein structures related to {query}
                      </p>
                    </div>

                    <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs text-orange-300">
                      {data.sources.pdb.length} structures
                    </span>

                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">

                    {data.sources.pdb.map((structure) => (
                      <article
                        key={structure.pdbId}
                        className="rounded-xl border border-white/10 bg-slate-900/50 p-6 transition hover:border-orange-400/30"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>
                            <p className="text-2xl font-bold text-orange-400">
                              {structure.pdbId}
                            </p>

                            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                              PDB Structure
                            </p>
                          </div>

                          <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs text-orange-300">
                            RCSB
                          </span>

                        </div>

                        <h3 className="mt-5 text-lg font-semibold leading-7">
                          {structure.title}
                        </h3>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">

                          <div>
                            <p className="text-xs text-slate-500">
                              Experimental Method
                            </p>

                            <p className="mt-1 text-sm text-slate-300">
                              {structure.experimentalMethod}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Resolution
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-300">
                              {getResolution(structure.resolution)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Publication Year
                            </p>

                            <p className="mt-1 text-sm text-slate-300">
                              {structure.citationYear || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              PubMed
                            </p>

                            <p className="mt-1 text-sm text-slate-300">
                              {structure.pubmedId || "—"}
                            </p>
                          </div>

                        </div>

                        {structure.citationTitle && (
                          <div className="mt-5 border-t border-white/10 pt-5">

                            <p className="text-xs text-slate-500">
                              Publication
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {structure.citationTitle}
                            </p>

                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">

                          <Link
                         href={`/structure/${structure.pdbId}`}
                       className="rounded-lg bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                         >
                             Open Structure →
                        </Link>

                          {structure.pubmedId && (
                            <a
                              href={`https://pubmed.ncbi.nlm.nih.gov/${structure.pubmedId}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/40 hover:text-white"
                            >
                              View PubMed →
                            </a>
                          )}

                        </div>

                      </article>
                    ))}

                  </div>

                </section>
              )}

          </div>
        )}

        {data &&
          !data.sources?.ncbi &&
          !data.sources?.uniprot &&
          (!data.sources?.pubmed ||
            data.sources.pubmed.length === 0) &&
          (!data.sources?.pdb ||
            data.sources.pdb.length === 0) &&
          !data.sources?.doi &&
          !error && (
            <p className="mt-10 text-slate-400">
              No biological results found.
            </p>
          )}

      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
          <div className="mx-auto max-w-6xl">
            <p className="text-slate-400">
              Loading search...
            </p>
          </div>
        </main>
      }
    >
      <SearchContent />
    </Suspense>
  );
}