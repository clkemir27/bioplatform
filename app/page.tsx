"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = query.trim();

    if (!value) return;

    window.location.href = `/search?q=${encodeURIComponent(value)}`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="text-2xl font-bold tracking-tight">
            Bio<span className="text-cyan-400">Platform</span>
          </div>

          <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
            <a href="#" className="hover:text-white">
              Search
            </a>
            <a href="#" className="hover:text-white">
              Projects
            </a>
            <a href="#" className="hover:text-white">
              Tools
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-24 text-center">
        <div className="mb-5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
          Unified Bioinformatics Research Platform
        </div>

        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Explore biological data
          <span className="block text-cyan-400">
            from one place.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
          Search genes, proteins, structures, publications, cancer data,
          pathways and more through a single research workspace.
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-10 flex w-full max-w-3xl flex-col gap-3 sm:flex-row"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="text"
            placeholder="Search gene, protein, sequence, PMID, DOI..."
            className="h-14 flex-1 rounded-xl border border-white/10 bg-white/5 px-5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
          />

          <button
            type="submit"
            className="h-14 rounded-xl bg-cyan-400 px-8 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Search
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-500">
          Try: TP53 · P04637 · 4MZR · PMID · DOI
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-8 text-center text-2xl font-semibold">
          Research tools in one workspace
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["🧬", "Genomics", "Genes, transcripts and sequences"],
            ["🧪", "Proteins", "Protein function and annotations"],
            ["🔬", "Structure", "3D structures and complexes"],
            ["📚", "Literature", "Biomedical publications"],
            ["🧫", "Cancer", "Cancer expression and clinical data"],
            ["🔗", "Interactions", "Protein interaction networks"],
            ["🛣️", "Pathways", "Biological pathways and processes"],
            ["🧬", "Sequence Tools", "BLAST, primers and sequence analysis"],
          ].map(([icon, title, description]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/40 hover:bg-white/10"
            >
              <div className="mb-4 text-3xl">{icon}</div>

              <h3 className="text-lg font-semibold">{title}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        BioPlatform — Integrated Bioinformatics Research Environment
      </footer>
    </main>
  );
}