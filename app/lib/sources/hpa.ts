import type { BioHpaProtein, BioIdentifier } from "@/app/lib/bio-types";

type HpaRecord = {
  Ensembl?: unknown;
  Gene?: unknown;
  "Gene description"?: unknown;
  Uniprot?: unknown;
  Chromosome?: unknown;
  Position?: unknown;
  "RNA tissue specificity"?: unknown;
  "RNA tissue distribution"?: unknown;
  "RNA tissue specific nTPM"?: unknown;
  "Protein tissue specificity"?: unknown;
  "Protein tissue distribution"?: unknown;
  "Protein tissue specific Intensity"?: unknown;
  "Tissue expression cluster"?: unknown;
  Evidence?: unknown;
};

const HPA_BASE_URL = "https://www.proteinatlas.org";
const ENSEMBL_GENE_ID_PATTERN = /^ENSG[0-9]{11}$/i;
const UNIPROT_ACCESSION_PATTERN =
  /^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9][A-Z0-9]{3}[0-9])$/i;

function isRecord(value: unknown): value is HpaRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getUniprotAccessions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))];
}

function getExpressionByTissue(
  value: unknown
): Record<string, string> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value).flatMap(([tissue, expression]) =>
    typeof expression === "string" || typeof expression === "number"
      ? [[tissue, String(expression)]]
      : []
  );

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function normalizeHpaRecord(record: HpaRecord): BioHpaProtein | null {
  const ensemblId = getString(record.Ensembl);
  if (!ensemblId || !ENSEMBL_GENE_ID_PATTERN.test(ensemblId)) {
    return null;
  }

  const uniprotAccessions = getUniprotAccessions(record.Uniprot);
  const crossReferences: BioIdentifier[] = [
    { source: "ensembl", type: "ensembl_id", value: ensemblId },
    ...uniprotAccessions.map((accession) => ({
      source: "uniprot" as const,
      type: "uniprot_accession" as const,
      value: accession,
    })),
  ];

  return {
    entityType: "protein",
    source: "hpa",
    ensemblId,
    geneSymbol: getString(record.Gene),
    geneDescription: getString(record["Gene description"]),
    uniprotAccessions,
    chromosome: getString(record.Chromosome),
    position: getString(record.Position),
    rnaTissueSpecificity: getString(record["RNA tissue specificity"]),
    rnaTissueDistribution: getString(record["RNA tissue distribution"]),
    rnaTissueSpecificNTPM: getExpressionByTissue(
      record["RNA tissue specific nTPM"]
    ),
    proteinTissueSpecificity: getString(record["Protein tissue specificity"]),
    proteinTissueDistribution: getString(record["Protein tissue distribution"]),
    proteinTissueSpecificIntensity: getExpressionByTissue(
      record["Protein tissue specific Intensity"]
    ),
    tissueExpressionCluster: getString(record["Tissue expression cluster"]),
    evidence: getString(record.Evidence),
    sourceUrl: `${HPA_BASE_URL}/${ensemblId}`,
    crossReferences,
  };
}

async function fetchHpaEntry(
  ensemblId: string,
  expectedUniprotAccession?: string
): Promise<BioHpaProtein | null> {
  const response = await fetch(
    `${HPA_BASE_URL}/${encodeURIComponent(ensemblId)}.json`,
    { cache: "no-store" }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("HPA entry request failed");
  }

  const data: unknown = await response.json();
  if (!isRecord(data)) {
    return null;
  }

  const returnedId = getString(data.Ensembl);
  if (!returnedId || returnedId.toUpperCase() !== ensemblId.toUpperCase()) {
    return null;
  }

  const accessions = getUniprotAccessions(data.Uniprot);
  if (
    expectedUniprotAccession &&
    !accessions.some(
      (accession) =>
        accession.toUpperCase() === expectedUniprotAccession.toUpperCase()
    )
  ) {
    return null;
  }

  return normalizeHpaRecord(data);
}

export async function getHpaProtein(
  identifier: string
): Promise<BioHpaProtein | null> {
  const value = identifier.trim();

  if (ENSEMBL_GENE_ID_PATTERN.test(value)) {
    return fetchHpaEntry(value.toUpperCase());
  }

  if (!UNIPROT_ACCESSION_PATTERN.test(value)) {
    return null;
  }

  const accession = value.toUpperCase();
  const searchResponse = await fetch(
    `${HPA_BASE_URL}/search/${encodeURIComponent(
      accession
    )}?format=json`,
    { cache: "no-store" }
  );

  if (searchResponse.status === 404) {
    return null;
  }

  if (!searchResponse.ok) {
    throw new Error("HPA search request failed");
  }

  const data: unknown = await searchResponse.json();
  if (!Array.isArray(data)) {
    return null;
  }

  const matchesByEnsemblId = new Map<string, HpaRecord>();
  for (const item of data) {
    if (!isRecord(item)) {
      continue;
    }

    const ensemblId = getString(item.Ensembl);
    const accessions = getUniprotAccessions(item.Uniprot);
    if (
      ensemblId &&
      ENSEMBL_GENE_ID_PATTERN.test(ensemblId) &&
      accessions.some(
        (candidate) => candidate.toUpperCase() === accession
      )
    ) {
      matchesByEnsemblId.set(ensemblId.toUpperCase(), item);
    }
  }

  if (matchesByEnsemblId.size !== 1) {
    return null;
  }

  const ensemblId = matchesByEnsemblId.keys().next().value;
  return ensemblId ? fetchHpaEntry(ensemblId, accession) : null;
}