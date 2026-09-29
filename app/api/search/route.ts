import { NextRequest, NextResponse } from "next/server";
import type {
  BioDoi,
  BioEnsemblGene,
  BioGene,
  BioHpaProtein,
  BioProtein,
  BioPublication,
  BioStructure,
} from "@/app/lib/bio-types";
import { classifyInput } from "@/app/lib/input-classifier";
import { createBioLinkedEntity } from "@/app/lib/entity-linking";
import { searchCrossref } from "@/app/lib/sources/crossref";
import { searchEnsemblGene as getEnsemblGene } from "@/app/lib/sources/ensembl";
import { getHpaProtein } from "@/app/lib/sources/hpa";
import { getGeneById, searchNcbiGene } from "@/app/lib/sources/ncbi";
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

  let hpaProtein: BioHpaProtein | null = null;
  if (inputType === "ensembl" || inputType === "uniprot") {
    try {
      hpaProtein = await getHpaProtein(query);
    } catch (error) {
      console.error("HPA error:", error);
    }
  }

  let ensemblGene: BioEnsemblGene | null = null;
  if (inputType === "ensembl") {
    try {
      ensemblGene = await getEnsemblGene(query);
    } catch (error) {
      console.error("Ensembl error:", error);
    }
  }

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
    if (inputType === "ensembl") {
      const ncbiGeneId = ensemblGene?.crossReferences.find(
        (reference) =>
          reference.source === "ncbi" &&
          reference.type === "ncbi_gene_id"
      )?.value;
      ncbiGene = ncbiGeneId ? await getGeneById(ncbiGeneId) : null;
    } else if (inputType === "gene") {
      ncbiGene = await searchNcbiGene(query);
    }
  } catch (error) {
    console.error("NCBI error:", error);
  }

  const downstreamQuery =
    inputType === "ensembl"
      ? ensemblGene?.symbol || ncbiGene?.symbol || null
      : query;
  const downstreamInputType = inputType === "ensembl" ? "gene" : inputType;

  let uniProt: BioProtein | null = null;
  if (downstreamQuery) {
    try {
      uniProt = await searchUniProt(downstreamQuery, downstreamInputType);
    } catch (error) {
      console.error("UniProt error:", error);
    }
  }

  let pubmed: BioPublication[] = [];
  if (downstreamQuery) {
    try {
      pubmed = await searchPubMed(downstreamQuery, downstreamInputType);
    } catch (error) {
      console.error("PubMed error:", error);
      pubmed = [];
    }
  }

  let pdb: BioStructure[] = [];
  if (downstreamQuery) {
    try {
      pdb = await searchRcsb(downstreamQuery, downstreamInputType);
    } catch (error) {
      console.error("RCSB error:", error);
      pdb = [];
    }
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

  const entities = [ncbiGene, uniProt, hpaProtein, ...pdb, ...pubmed, doi].filter(
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
      hpa: hpaProtein,
      ensembl: ensemblGene,
      ncbi: ncbiGene,
      uniprot: uniProt,
      pubmed,
      pdb,
      doi,
    },
    linkedEntities,
  });
}