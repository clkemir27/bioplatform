import Link from "next/link";

type PDBData = {
  rcsb_id?: string;

  struct?: {
    title?: string;
  };

  exptl?: Array<{
    method?: string;
  }>;

  rcsb_entry_info?: {
    diffrn_resolution_high?: number;
    experimental_method?: string;
    deposited_atom_count?: number;
    deposited_model_count?: number;
  };

  rcsb_primary_citation?: {
    title?: string;
    year?: number;
    pdbx_database_id_DOI?: string;
  };

  rcsb_entry_container_identifiers?: {
    pubmed_ids?: number[];
  };

  database_2?: Array<{
    database_id?: string;
    database_code?: string;
    pdbx_database_accession?: string;
  }>;
};

type PageProps = {
  params: Promise<{
    pdbId: string;
  }>;
};

export default async function StructurePage({
  params,
}: PageProps) {
  const { pdbId } = await params;

  const normalizedPdbId = pdbId.trim().toUpperCase();

  let data: PDBData | null = null;
  let error = "";

  try {
    const response = await fetch(
      `https://data.rcsb.org/rest/v1/core/entry/${encodeURIComponent(
        normalizedPdbId
      )}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `RCSB PDB request failed: ${response.status}`
      );
    }

    data = await response.json();
  } catch (err) {
    console.error("RCSB structure error:", err);

    error =
      err instanceof Error
        ? err.message
        : "Unable to load structure data.";
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to BioPlatform
          </Link>

          <div className="mt-10 rounded-2xl border border-red-400/30 bg-red-400/10 p-6">
            <h1 className="text-2xl font-semibold text-red-300">
              Structure not found
            </h1>

            <p className="mt-3 text-sm text-red-200">
              Unable to retrieve PDB structure{" "}
              <strong>{normalizedPdbId}</strong> from RCSB PDB.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // PDB ID
  // --------------------------------------------------
  // IMPORTANT:
  // We use the ID from the URL instead of
  // database_2.pdbx_database_accession.
  //
  // Example:
  // 1DT7
  //
  // NOT:
  // pdb_00001dt7
  // --------------------------------------------------

  const displayPdbId = normalizedPdbId;

  // --------------------------------------------------
  // Structure information
  // --------------------------------------------------

  const title =
    data.struct?.title ||
    "Unknown structure";

  const experimentalMethod =
    data.exptl?.[0]?.method ||
    data.rcsb_entry_info?.experimental_method ||
    "Unknown";

  const resolution =
    data.rcsb_entry_info?.diffrn_resolution_high;

  // --------------------------------------------------
  // Publication information
  // --------------------------------------------------

  const publicationTitle =
    data.rcsb_primary_citation?.title ||
    null;

  const publicationYear =
    data.rcsb_primary_citation?.year ||
    null;

  const pubmedId =
    data.rcsb_entry_container_identifiers
      ?.pubmed_ids?.[0] ||
    null;

  // --------------------------------------------------
  // DOI
  // --------------------------------------------------
  // First look for a DOI entry in database_2.
  // If it is not there, use the DOI from the
  // primary citation.
  // --------------------------------------------------

  const doi =
    data.database_2?.find(
      (item) => item.database_id === "DOI"
    )?.database_code ||
    data.rcsb_primary_citation
      ?.pdbx_database_id_DOI ||
    null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">

        {/* Back */}

        <Link
          href="/search?q=TP53"
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          ← Back to search
        </Link>

        {/* Header */}

        <div className="mt-8">

          <div className="inline-flex items-center rounded-full bg-orange-400/10 px-3 py-1 text-xs text-orange-300">
            RCSB PDB
          </div>

          <p className="mt-5 text-sm uppercase tracking-widest text-slate-500">
            PDB ID
          </p>

          <h1 className="mt-2 text-5xl font-bold text-orange-400">
            {displayPdbId}
          </h1>

          <h2 className="mt-6 max-w-4xl text-2xl font-semibold leading-9">
            {title}
          </h2>

        </div>

        {/* Structure Information */}

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8">

          <h2 className="text-2xl font-semibold">
            Structure Information
          </h2>

          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">

            {/* Experimental Method */}

            <div>
              <p className="text-sm text-slate-400">
                Experimental Method
              </p>

              <p className="mt-2 font-semibold text-white">
                {experimentalMethod}
              </p>
            </div>

            {/* Resolution */}

            <div>
              <p className="text-sm text-slate-400">
                Resolution
              </p>

              <p className="mt-2 font-semibold text-white">
                {typeof resolution === "number"
                  ? `${resolution} Å`
                  : "Not available"}
              </p>
            </div>

            {/* PDB ID */}

            <div>
              <p className="text-sm text-slate-400">
                PDB ID
              </p>

              <p className="mt-2 font-semibold text-white">
                {displayPdbId}
              </p>
            </div>

            {/* Publication Year */}

            <div>
              <p className="text-sm text-slate-400">
                Publication Year
              </p>

              <p className="mt-2 font-semibold text-white">
                {publicationYear || "Not available"}
              </p>
            </div>

          </div>

        </section>

        {/* Publication */}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8">

          <h2 className="text-2xl font-semibold">
            Publication
          </h2>

          {publicationTitle ? (
            <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-300">
              {publicationTitle}
            </p>
          ) : (
            <p className="mt-5 text-slate-400">
              Publication information is not available.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-6">

            {/* PubMed */}

            {pubmedId && (
              <div>
                <p className="text-sm text-slate-400">
                  PubMed
                </p>

                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-purple-300 hover:text-purple-200 hover:underline"
                >
                  PMID: {pubmedId}
                </a>
              </div>
            )}

            {/* DOI */}

            {doi && (
              <div>
                <p className="text-sm text-slate-400">
                  DOI
                </p>

                <p className="mt-2 font-mono text-sm text-cyan-300">
                  {doi}
                </p>
              </div>
            )}

          </div>

        </section>

        {/* 3D Structure */}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8">

          <h2 className="text-2xl font-semibold">
            3D Structure
          </h2>

          <div className="mt-6 flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-900/50">

            <div className="text-center">

              <div className="text-5xl">
                🧬
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                Interactive 3D Viewer
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                The molecular structure viewer will be
                integrated into BioPlatform in the next step.
              </p>

            </div>

          </div>

        </section>

        {/* Data Source */}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">

          <p className="text-sm text-slate-400">
            <span className="font-semibold text-slate-300">
              Data Source:
            </span>{" "}
            RCSB Protein Data Bank
          </p>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            Structure metadata displayed on this page is
            retrieved directly from the RCSB PDB Data API.
          </p>

        </section>

      </div>
    </main>
  );
}