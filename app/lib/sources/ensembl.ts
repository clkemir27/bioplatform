import type { BioEnsemblGene, BioIdentifier } from "@/app/lib/bio-types";
import { isEnsemblGeneId } from "@/app/lib/input-classifier";

type EnsemblLookupResponse = {
  id?: string;
  object_type?: string;
  display_name?: string;
  description?: string;
  species?: string;
  biotype?: string;
  seq_region_name?: string;
  start?: number;
  end?: number;
  strand?: number;
  assembly_name?: string;
};

type EnsemblXref = {
  dbname?: string;
  primary_id?: string | number;
};

const ENSEMBL_REST_URL = "https://rest.ensembl.org";

export async function searchEnsemblGene(
  query: string
): Promise<BioEnsemblGene | null> {
  const stableId = query.trim().toUpperCase();

  if (!isEnsemblGeneId(stableId)) {
    return null;
  }

  const lookupResponse = await fetch(
    `${ENSEMBL_REST_URL}/lookup/id/${encodeURIComponent(
      stableId
    )}?content-type=application/json`,
    { cache: "no-store" }
  );

  if (!lookupResponse.ok) {
    throw new Error("Ensembl gene lookup request failed");
  }

  const gene: EnsemblLookupResponse = await lookupResponse.json();

  if (gene.object_type !== "Gene" || gene.id !== stableId) {
    return null;
  }

  const xrefsResponse = await fetch(
    `${ENSEMBL_REST_URL}/xrefs/id/${encodeURIComponent(
      stableId
    )}?external_db=EntrezGene;content-type=application/json`,
    { cache: "no-store" }
  );

  if (!xrefsResponse.ok) {
    throw new Error("Ensembl cross-reference request failed");
  }

  const xrefs: EnsemblXref[] = await xrefsResponse.json();
  const crossReferences = xrefs.flatMap((xref): BioIdentifier[] => {
    if (
      xref.dbname !== "EntrezGene" ||
      xref.primary_id === undefined ||
      xref.primary_id === null
    ) {
      return [];
    }

    const ncbiGeneId = String(xref.primary_id).trim();
    return ncbiGeneId
      ? [{ source: "ncbi", type: "ncbi_gene_id", value: ncbiGeneId }]
      : [];
  });

  return {
    entityType: "gene",
    source: "ensembl",
    id: gene.id,
    symbol: gene.display_name || null,
    name: gene.description || null,
    organism: gene.species || null,
    geneType: gene.biotype || null,
    chromosome: gene.seq_region_name || null,
    start: typeof gene.start === "number" ? gene.start : null,
    end: typeof gene.end === "number" ? gene.end : null,
    strand: typeof gene.strand === "number" ? gene.strand : null,
    assemblyName: gene.assembly_name || null,
    crossReferences,
  };
}