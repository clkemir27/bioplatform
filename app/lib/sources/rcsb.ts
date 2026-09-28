import type { BioStructure } from "@/app/lib/bio-types";
import type { InputType } from "@/app/lib/input-classifier";

type RcsbSearchResponse = {
  result_set?: Array<{ identifier: string }>;
};

type RcsbEntryResponse = {
  struct?: { title?: string };
  exptl?: Array<{ method?: string }>;
  rcsb_entry_info?: {
    experimental_method?: string;
    diffrn_resolution_high?: { value?: number };
  };
  rcsb_primary_citation?: {
    title?: string;
    year?: number;
    pdbx_database_id_DOI?: string;
  };
  rcsb_entry_container_identifiers?: { pubmed_ids?: string[] };
};

export async function searchRcsb(
  query: string,
  inputType: InputType
): Promise<BioStructure[]> {
  let pdbIds: string[];

  if (inputType === "pdb") {
    pdbIds = [query.toUpperCase()];
  } else {
    const attribute =
      inputType === "uniprot"
        ? "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession"
        : "rcsb_entity_source_organism.rcsb_gene_name.value";
    const searchBody = {
      query: {
        type: "terminal",
        service: "text",
        parameters: { attribute, operator: "exact_match", value: query },
      },
      return_type: "entry",
      request_options: { paginate: { start: 0, rows: 10 } },
    };

    const searchResponse = await fetch(
      "https://search.rcsb.org/rcsbsearch/v2/query",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchBody),
        cache: "no-store",
      }
    );

    if (!searchResponse.ok) {
      throw new Error("RCSB search request failed");
    }

    const searchData: RcsbSearchResponse = await searchResponse.json();
    pdbIds = searchData.result_set?.map((item) => item.identifier) || [];
  }

  if (pdbIds.length === 0) {
    return [];
  }

  const results = await Promise.all(
    pdbIds.map(async (pdbId): Promise<BioStructure | null> => {
      try {
        const response = await fetch(
          `https://data.rcsb.org/rest/v1/core/entry/${pdbId}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`RCSB detail request failed for ${pdbId}`);
        }

        const data: RcsbEntryResponse = await response.json();
        const citation = data.rcsb_primary_citation;

        return {
          entityType: "structure",
          source: "pdb",
          pdbId,
          title: data.struct?.title || "Unknown",
          experimentalMethod:
            data.exptl?.[0]?.method ||
            data.rcsb_entry_info?.experimental_method ||
            "Unknown",
          resolution:
            data.rcsb_entry_info?.diffrn_resolution_high?.value ?? null,
          citationTitle: citation?.title || null,
          citationYear: citation?.year || null,
          doi: citation?.pdbx_database_id_DOI || null,
          pubmedId:
            data.rcsb_entry_container_identifiers?.pubmed_ids?.[0] || null,
          url: `https://www.rcsb.org/structure/${pdbId}`,
        };
      } catch (error) {
        console.error(`RCSB detail error (${pdbId}):`, error);
        return null;
      }
    })
  );

  return results.filter((item): item is BioStructure => item !== null);
}