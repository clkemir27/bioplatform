import type { BioDoi } from "@/app/lib/bio-types";

type CrossrefAuthor = { given?: string; family?: string };
type CrossrefWork = {
  DOI?: string;
  title?: string[];
  type?: string;
  publisher?: string;
  "container-title"?: string[];
  published?: { "date-parts"?: number[][] };
  author?: CrossrefAuthor[];
  URL?: string;
};
type CrossrefResponse = { message?: CrossrefWork };

export async function searchCrossref(query: string): Promise<BioDoi | null> {
  const response = await fetch(
    `https://api.crossref.org/v1/works/${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Crossref DOI request failed");
  }

  const data: CrossrefResponse = await response.json();
  const work = data.message;

  if (!work) {
    return null;
  }

  return {
    entityType: "doi",
    source: "crossref",
    doi: work.DOI || query,
    title: work.title?.[0] || null,
    workType: work.type || null,
    publisher: work.publisher || null,
    journal: work["container-title"]?.[0] || null,
    published: work.published?.["date-parts"]?.[0] || null,
    authors:
      work.author?.map((author) => ({
        given: author.given || null,
        family: author.family || null,
      })) || [],
    url: work.URL || null,
  };
}