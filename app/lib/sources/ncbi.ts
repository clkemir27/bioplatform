import { XMLParser } from "fast-xml-parser";
import type { BioGene } from "@/app/lib/bio-types";

type NcbiGeneRecord = {
  Entrezgene_source?: {
    BioSource?: {
      BioSource_org?: {
        "Org-ref"?: {
          "Org-ref_taxname"?: string;
        };
      };
    };
  };
  Entrezgene_type?: { "@_value"?: string };
  Entrezgene_gene?: {
    "Gene-ref"?: {
      "Gene-ref_locus"?: string;
      "Gene-ref_desc"?: string;
    };
  };
};

type NcbiGeneXml = {
  "Entrezgene-Set"?: { Entrezgene?: NcbiGeneRecord };
};

type NcbiSearchResponse = {
  esearchresult?: { idlist?: string[] };
};

function normalizeNcbiGene(
  geneXml: string,
  geneId: string,
  symbolFallback: string | null
): BioGene | null {
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed: NcbiGeneXml = parser.parse(geneXml);
  const gene = parsed["Entrezgene-Set"]?.Entrezgene;

  if (!gene) {
    return null;
  }

  return {
    entityType: "gene",
    source: "ncbi",
    id: geneId,
    symbol:
      gene.Entrezgene_gene?.["Gene-ref"]?.["Gene-ref_locus"] ||
      symbolFallback,
    name:
      gene.Entrezgene_gene?.["Gene-ref"]?.["Gene-ref_desc"] || "Unknown",
    organism:
      gene.Entrezgene_source?.BioSource?.BioSource_org?.["Org-ref"]?.[
        "Org-ref_taxname"
      ] || "Unknown",
    geneType: gene.Entrezgene_type?.["@_value"] || "Unknown",
  };
}

async function fetchNcbiGeneById(
  geneId: string,
  symbolFallback: string | null
): Promise<BioGene | null> {
  const detailResponse = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=gene&id=${encodeURIComponent(
      geneId
    )}&retmode=xml`,
    { cache: "no-store" }
  );

  if (!detailResponse.ok) {
    throw new Error("NCBI gene detail request failed");
  }

  return normalizeNcbiGene(
    await detailResponse.text(),
    geneId,
    symbolFallback
  );
}

export async function getGeneById(geneId: string): Promise<BioGene | null> {
  if (!/^[1-9]\d*$/.test(geneId)) {
    return null;
  }

  return fetchNcbiGeneById(geneId, null);
}

export async function searchNcbiGene(query: string): Promise<BioGene | null> {
  const ncbiQuery = `${query}[Gene Name] AND Homo sapiens[Organism]`;
  const searchResponse = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=${encodeURIComponent(
      ncbiQuery
    )}&retmode=json`,
    { cache: "no-store" }
  );

  if (!searchResponse.ok) {
    throw new Error("NCBI search request failed");
  }

  const searchData: NcbiSearchResponse = await searchResponse.json();
  const geneId = searchData.esearchresult?.idlist?.[0];

  if (!geneId) {
    return null;
  }

  return fetchNcbiGeneById(geneId, query);
}