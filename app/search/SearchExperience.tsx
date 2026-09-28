"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  BioDoi,
  BioEntity,
  BioGene,
  BioLinkedEntity,
  BioProtein,
  BioPublication,
  BioStructure,
} from "@/app/lib/bio-types";
import type { InputType } from "@/app/lib/input-classifier";

type SearchResponse = {
  query?: string;
  inputType?: InputType;
  sources?: {
    ncbi?: BioGene | null;
    uniprot?: BioProtein | null;
    pubmed?: BioPublication[];
    pdb?: BioStructure[];
    doi?: BioDoi | null;
  };
  linkedEntities?: BioLinkedEntity[];
  error?: string;
};

type SearchError = {
  query: string;
  message: string;
};

function getEntityLabel(entity: BioEntity): string {
  switch (entity.entityType) {
    case "gene":
      return `NCBI Gene ${entity.id || ""} ${entity.symbol || ""}`.trim();
    case "protein":
      return `UniProt ${entity.accession || entity.id || ""}`.trim();
    case "publication":
      return `PubMed ${entity.pmid}`;
    case "structure":
      return `PDB ${entity.pdbId}`;
    case "doi":
      return `DOI ${entity.doi}`;
  }
}

function getResolution(resolution: BioStructure["resolution"]): string {
  return resolution === null ? "Not available" : `${resolution} Å`;
}

function getPublicationDate(published: number[] | null): string {
  return published?.join("-") || "Not available";
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || "Not available"}
      </dd>
    </div>
  );
}

function SearchExperience({ query }: { query: string }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(query);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<SearchError | null>(null);

  useEffect(() => {
    if (!query) {
      return;
    }

    const controller = new AbortController();

    async function loadResults() {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const result: SearchResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "Search could not be completed. Please try again."
          );
        }

        setData({ ...result, query: result.query || query });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSearchError({
          query,
          message:
            error instanceof Error && error.message !== "Failed to fetch"
              ? error.message
              : "Search could not be completed. Please try again.",
        });
      }
    }

    void loadResults();
    return () => controller.abort();
  }, [query]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchTerm.trim();
    if (nextQuery) {
      router.push(`/search?q=${encodeURIComponent(nextQuery)}`);
    }
  }

  const currentData = data?.query === query ? data : null;
  const currentError = searchError?.query === query ? searchError : null;
  const sources = currentData?.sources;
  const publications = sources?.pubmed || [];
  const structures = sources?.pdb || [];
  const hasBiologicalData = Boolean(
    sources?.ncbi ||
      sources?.uniprot ||
      publications.length > 0 ||
      structures.length > 0 ||
      sources?.doi
  );
  const linkedEntities = (currentData?.linkedEntities || []).filter(
    (linkedEntity) =>
      linkedEntity.relatedEntities.length > 0 ||
      linkedEntity.relationships.length > 0
  );
  const isSearching = Boolean(query) && !currentData && !currentError;

  return (
    <main className="min-h-screen bg-[#f2f6f3] text-[#192720]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(#b9c9be 0.7px, transparent 0.7px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto min-h-screen max-w-7xl px-4 pb-16 sm:px-7 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-emerald-950/10 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex w-fit items-center gap-3 text-[#192720]">
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-900 text-sm font-bold text-white">
              BP
            </span>
            <span className="font-serif text-2xl font-semibold">BioPlatform</span>
          </Link>

          <form
            onSubmit={handleSearch}
            className="flex w-full max-w-2xl gap-2 rounded-lg border border-slate-300 bg-white p-1.5 shadow-sm focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/10"
          >
            <label className="sr-only" htmlFor="biological-search">
              Search biological databases
            </label>
            <input
              id="biological-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Gene, accession, PMID, PDB ID or DOI"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-900 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <span aria-hidden="true">⌕</span>
              Search
            </button>
          </form>
        </header>

        <section className="py-8 sm:py-11">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase text-emerald-800">
              Biological data search
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Search results
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Search results from connected biological databases, normalized into one view.
            </p>
          </div>

          {query && (
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-emerald-950/10 py-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Searched value</p>
                <p className="mt-1 break-all font-mono text-base font-semibold text-slate-900">
                  {query}
                </p>
              </div>
              <div className="h-9 w-px bg-slate-300" />
              <div>
                <p className="text-xs font-medium text-slate-500">Detected input type</p>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                  {currentData?.inputType || (isSearching ? "Detecting..." : "Unknown")}
                </p>
              </div>
            </div>
          )}
        </section>

        {isSearching && (
          <div
            role="status"
            className="border-y border-emerald-950/10 bg-white/70 px-5 py-7 text-sm font-medium text-slate-600"
          >
            <span className="mr-3 inline-block size-2 animate-pulse rounded-full bg-emerald-700" />
            Searching biological databases...
          </div>
        )}

        {currentError && (
          <div
            role="alert"
            className="border-l-4 border-rose-600 bg-rose-50 px-5 py-4 text-sm text-rose-900"
          >
            <p className="font-semibold">Search unavailable</p>
            <p className="mt-1">{currentError.message}</p>
          </div>
        )}

        {currentData && !hasBiologicalData && (
          <div className="border-y border-slate-200 bg-white px-5 py-9 text-center">
            <h2 className="font-serif text-2xl font-semibold text-slate-900">
              No biological data found
            </h2>
          </div>
        )}

        {currentData && hasBiologicalData && (
          <div className="space-y-10">
            {(sources?.ncbi || sources?.uniprot) && (
              <div className="grid gap-5 lg:grid-cols-2">
                {sources.ncbi && (
                  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-cyan-800">NCBI</p>
                        <h2 className="mt-1 font-serif text-2xl font-semibold">NCBI Gene</h2>
                      </div>
                      <span className="rounded-md bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-900">
                        Gene record
                      </span>
                    </div>
                    <p className="mt-5 text-xs font-medium text-slate-500">Gene Symbol</p>
                    <p className="mt-1 break-words font-serif text-3xl font-semibold text-cyan-900">
                      {sources.ncbi.symbol || "Not available"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {sources.ncbi.name || "Name not available"}
                    </p>
                    <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
                      <Field label="NCBI Gene ID" value={sources.ncbi.id} />
                      <Field label="Organism" value={sources.ncbi.organism} />
                      <Field label="Gene Type" value={sources.ncbi.geneType} />
                    </dl>
                  </section>
                )}

                {sources.uniprot && (
                  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-emerald-800">UniProt</p>
                        <h2 className="mt-1 font-serif text-2xl font-semibold">UniProt</h2>
                      </div>
                      <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                        Protein record
                      </span>
                    </div>
                    <p className="mt-5 text-xs font-medium text-slate-500">Protein Name</p>
                    <p className="mt-1 break-words font-serif text-2xl font-semibold leading-snug text-emerald-950">
                      {sources.uniprot.proteinName || "Name not available"}
                    </p>
                    <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
                      <Field label="Accession" value={sources.uniprot.accession} />
                      <Field label="UniProt ID" value={sources.uniprot.id} />
                      <Field label="Entry Type" value={sources.uniprot.entryType} />
                      <Field label="Organism" value={sources.uniprot.organism} />
                    </dl>
                  </section>
                )}
              </div>
            )}

            {publications.length > 0 && (
              <section>
                <div className="mb-4 flex items-end justify-between gap-4 border-b border-slate-300 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-indigo-800">Literature</p>
                    <h2 className="mt-1 font-serif text-2xl font-semibold">PubMed</h2>
                  </div>
                  <span className="text-sm text-slate-500">{publications.length} publications</span>
                </div>
                <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
                  {publications.map((publication) => {
                    const doi = publication.crossReferences?.find(
                      (identifier) => identifier.type === "doi"
                    )?.value;
                    return (
                      <article key={publication.pmid} className="px-4 py-5 sm:px-6">
                        <h3 className="text-base font-semibold leading-6 text-slate-900">
                          {publication.title}
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${publication.pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-indigo-800 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-950"
                          >
                            PMID {publication.pmid}
                          </a>
                          <span>Published {publication.pubDate}</span>
                          {doi && (
                            <a
                              href={`https://doi.org/${doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950"
                            >
                              DOI {doi}
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {structures.length > 0 && (
              <section>
                <div className="mb-4 flex items-end justify-between gap-4 border-b border-slate-300 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-amber-800">RCSB PDB</p>
                    <h2 className="mt-1 font-serif text-2xl font-semibold">Protein Structures</h2>
                  </div>
                  <span className="text-sm text-slate-500">{structures.length} structures</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {structures.map((structure) => (
                    <article
                      key={structure.pdbId}
                      className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-lg font-bold text-amber-900">
                            {structure.pdbId}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {structure.experimentalMethod}
                          </p>
                        </div>
                        <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                          {getResolution(structure.resolution)}
                        </span>
                      </div>
                      <h3 className="mt-4 break-words text-base font-semibold leading-6 text-slate-900">
                        {structure.title}
                      </h3>
                      <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                        <Field
                          label="Publication"
                          value={structure.citationTitle}
                        />
                        <Field
                          label="Publication Year"
                          value={structure.citationYear?.toString() || null}
                        />
                        <Field label="PubMed ID" value={structure.pubmedId} />
                        <Field label="DOI" value={structure.doi} />
                      </dl>
                      <div className="mt-auto pt-6">
                        <Link
                          href={`/structure/${structure.pdbId}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                        >
                          View Structure
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {sources?.doi && (
              <section className="rounded-lg border border-rose-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-rose-800">Crossref</p>
                    <h2 className="mt-1 font-serif text-2xl font-semibold">Publication / DOI</h2>
                  </div>
                  <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-900">
                    DOI record
                  </span>
                </div>
                <h3 className="mt-5 font-serif text-xl font-semibold leading-7 text-slate-950">
                  {sources.doi.title || "Title not available"}
                </h3>
                <a
                  href={sources.doi.url || `https://doi.org/${sources.doi.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block break-all text-sm font-semibold text-rose-800 underline decoration-rose-300 underline-offset-4 hover:text-rose-950"
                >
                  {sources.doi.doi}
                </a>
                <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Publisher" value={sources.doi.publisher} />
                  <Field label="Journal" value={sources.doi.journal} />
                  <Field
                    label="Published"
                    value={getPublicationDate(sources.doi.published)}
                  />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-xs font-medium text-slate-500">Authors</dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-800">
                      {sources.doi.authors.length > 0
                        ? sources.doi.authors
                            .map((author) =>
                              [author.given, author.family]
                                .filter(Boolean)
                                .join(" ")
                            )
                            .filter(Boolean)
                            .join(", ")
                        : "Not available"}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {linkedEntities.length > 0 && (
              <section>
                <div className="mb-4 border-b border-slate-300 pb-3">
                  <p className="text-xs font-semibold uppercase text-teal-800">Identifier references</p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold">
                    Related biological entities
                  </h2>
                </div>
                <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
                  {linkedEntities.map((linkedEntity, index) => (
                    <div key={`${linkedEntity.primary.entityType}-${index}`} className="px-4 py-4 sm:px-6">
                      <p className="text-xs font-medium text-slate-500">
                        Related to {getEntityLabel(linkedEntity.primary)}
                      </p>
                      {linkedEntity.relatedEntities.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {linkedEntity.relatedEntities.map((entity, entityIndex) => (
                            <li
                              key={`${getEntityLabel(entity)}-${entityIndex}`}
                              className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-sm font-medium text-teal-950"
                            >
                              {getEntityLabel(entity)}
                            </li>
                          ))}
                        </ul>
                      )}
                      {linkedEntity.relationships.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                          {linkedEntity.relationships.map((relationship, relationshipIndex) => (
                            <li key={`${relationship.type}-${relationship.target.value}-${relationshipIndex}`}>
                              {relationship.type.replaceAll("_", " ")} · {relationship.target.value}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default SearchExperience;
