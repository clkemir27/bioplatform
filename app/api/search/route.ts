import { NextRequest, NextResponse } from "next/server";
import type { BioDoi, BioGene, BioProtein, BioPublication, BioStructure } from "@/app/lib/bio-types";
import { classifyInput } from "@/app/lib/input-classifier";
import { createBioLinkedEntity } from "@/app/lib/entity-linking";
import { searchCrossref } from "@/app/lib/sources/crossref";
import { searchNcbiGene } from "@/app/lib/sources/ncbi";
import { searchPubMed } from "@/app/lib/sources/pubmed";
import { searchRcsb } from "@/app/lib/sources/rcsb";
import { searchUniProt } from "@/app/lib/sources/uniprot";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 }
    );
  }

  const inputType = classifyInput(query);

  let doi: BioDoi | null = null;
  if (inputType === "doi") {
    try {
      doi = await searchCrossref(query);
    } catch (error) {
      console.error("Crossref DOI error:", error);
      doi = null;
    }
  }

  let ncbiGene: BioGene | null = null;
  try {
    ncbiGene = await searchNcbiGene(query);
  } catch (error) {
    console.error("NCBI error:", error);
  }

  let uniProt: BioProtein | null = null;
  try {
    uniProt = await searchUniProt(query, inputType);
  } catch (error) {
    console.error("UniProt error:", error);
  }

  let pubmed: BioPublication[] = [];
  try {
    pubmed = await searchPubMed(query, inputType);
  } catch (error) {
    console.error("PubMed error:", error);
    pubmed = [];
  }

  let pdb: BioStructure[] = [];
  try {
    pdb = await searchRcsb(query, inputType);
  } catch (error) {
    console.error("RCSB error:", error);
    pdb = [];
  }

  const existingPubMedIds = new Set(pubmed.map((publication) => publication.pmid));
  const missingPubMedIds = [
    ...new Set(
      pdb.flatMap((structure) =>
        structure.pubmedId ? [structure.pubmedId] : []
      )
    ),
  ].filter((pmid) => !existingPubMedIds.has(pmid));

  const rcsbPublications: BioPublication[] = [];
  const pubmedLookupBatchSize = 2;

  for (
    let index = 0;
    index < missingPubMedIds.length;
    index += pubmedLookupBatchSize
  ) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const batch = missingPubMedIds.slice(index, index + pubmedLookupBatchSize);
    const batchResults = await Promise.all(
      batch.map(async (pmid) => {
        try {
          return await searchPubMed(pmid, "pmid");
        } catch (error) {
          console.error(`PubMed lookup failed for RCSB PMID ${pmid}:`, error);
          return [];
        }
      })
    );

    rcsbPublications.push(...batchResults.flat());
  }

  pubmed = [
    ...new Map(
      [...pubmed, ...rcsbPublications].map((publication) => [
        publication.pmid,
        publication,
      ])
    ).values(),
  ];

  const entities = [ncbiGene, uniProt, ...pdb, ...pubmed, doi].filter(
    (entity) => entity !== null
  );
  const primaryEntity = uniProt ?? ncbiGene ?? pdb[0] ?? pubmed[0] ?? doi;
  const linkedEntities = primaryEntity
    ? [
        createBioLinkedEntity(
          primaryEntity,
          entities.filter((entity) => entity !== primaryEntity)
        ),
      ]
    : [];

  return NextResponse.json({
    query,
    inputType,
    sources: {
      ncbi: ncbiGene,
      uniprot: uniProt,
      pubmed,
      pdb,
      doi,
    },
    linkedEntities,
  });
}