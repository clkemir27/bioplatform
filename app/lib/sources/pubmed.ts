import type { BioPublication } from "@/app/lib/bio-types";
import type { InputType } from "@/app/lib/input-classifier";

type PubMedSearchResponse = { esearchresult?: { idlist?: string[] } };
type PubMedArticle = {
  title?: string;
  pubdate?: string;
  articleids?: Array<{ idtype?: string; value?: string }>;
};
type PubMedSummaryResponse = {
  result?: Record<string, PubMedArticle | undefined>;
};

export async function searchPubMed(
  query: string,
  inputType: InputType
): Promise<BioPublication[]> {
  let pubmedIds: string[];

  if (inputType === "pmid") {
    pubmedIds = [query];
  } else {
    const searchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
        query
      )}&retmode=json&retmax=5`,
      { cache: "no-store" }
    );

    if (!searchResponse.ok) {
      throw new Error("PubMed search request failed");
    }

    const searchData: PubMedSearchResponse = await searchResponse.json();
    pubmedIds = searchData.esearchresult?.idlist || [];
  }

  if (pubmedIds.length === 0) {
    return [];
  }

  const summaryResponse = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pubmedIds.join(
      ","
    )}&retmode=json`,
    { cache: "no-store" }
  );

  if (!summaryResponse.ok) {
    throw new Error("PubMed summary request failed");
  }

  const summaryData: PubMedSummaryResponse = await summaryResponse.json();

  return pubmedIds.map((id) => {
    const article = summaryData.result?.[id];
    return {
      entityType: "publication",
      source: "pubmed",
      crossReferences: (article?.articleids || []).flatMap((reference) =>
        reference.idtype === "doi" && reference.value
          ? [
              {
                source: "crossref" as const,
                type: "doi" as const,
                value: reference.value,
              },
            ]
          : []
      ),
      pmid: id,
      title: article?.title || "Unknown",
      pubDate: article?.pubdate || "Unknown",
    };
  });
}