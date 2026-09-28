import type { BioIdentifier, BioProtein } from "@/app/lib/bio-types";
import type { InputType } from "@/app/lib/input-classifier";

type UniProtResult = {
  primaryAccession?: string;
  uniProtkbId?: string;
  entryType?: string;
  proteinDescription?: {
    recommendedName?: { fullName?: { value?: string } };
  };
  organism?: { scientificName?: string };
  uniProtKBCrossReferences?: Array<{
    database?: string;
    id?: string;
  }>;
};

type UniProtSearchResponse = { results?: UniProtResult[] };

export async function searchUniProt(
  query: string,
  inputType: InputType
): Promise<BioProtein | null> {
  const uniProtQuery =
    inputType === "uniprot"
      ? `accession:${query}`
      : `gene:${query} AND organism_id:9606 AND reviewed:true`;

  const response = await fetch(
    `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(
      uniProtQuery
    )}&format=json&size=1`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("UniProt request failed");
  }

  const data: UniProtSearchResponse = await response.json();
  const result = data.results?.[0];

  if (!result) {
    return null;
  }

  return {
    entityType: "protein",
    source: "uniprot",
    crossReferences: (result.uniProtKBCrossReferences || []).flatMap(
      (reference): BioIdentifier[] =>
        reference.database === "GeneID" && reference.id
          ? [
              {
                source: "ncbi",
                type: "ncbi_gene_id",
                value: reference.id,
              },
            ]
          : []
    ),
    accession: result.primaryAccession || null,
    id: result.uniProtkbId || null,
    entryType: result.entryType || null,
    proteinName:
      result.proteinDescription?.recommendedName?.fullName?.value || null,
    organism: result.organism?.scientificName || null,
  };
}