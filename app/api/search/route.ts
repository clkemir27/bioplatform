import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 }
    );
  }

  // ==========================================
  // 1. NCBI GENE
  // ==========================================

  let ncbiGene = null;

  try {
    const ncbiQuery = `${query}[Gene Name] AND Homo sapiens[Organism]`;

    const searchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=${encodeURIComponent(
        ncbiQuery
      )}&retmode=json`,
      {
        cache: "no-store",
      }
    );

    if (!searchResponse.ok) {
      throw new Error("NCBI search request failed");
    }

    const searchData = await searchResponse.json();
    const ids = searchData.esearchresult?.idlist || [];

    if (ids.length > 0) {
      const geneId = ids[0];

      const detailResponse = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=gene&id=${geneId}&retmode=xml`,
        {
          cache: "no-store",
        }
      );

      if (!detailResponse.ok) {
        throw new Error("NCBI gene detail request failed");
      }

      const geneXml = await detailResponse.text();

      const parser = new XMLParser({
        ignoreAttributes: false,
      });

      const parsed = parser.parse(geneXml);

      const gene =
        parsed?.["Entrezgene-Set"]?.Entrezgene;

      const organism =
        gene?.Entrezgene_source?.BioSource?.[
          "BioSource_org"
        ]?.["Org-ref"]?.["Org-ref_taxname"] || "Unknown";

      const geneType =
        gene?.Entrezgene_type?.["@_value"] || "Unknown";

      const symbol =
        gene?.Entrezgene_gene?.["Gene-ref"]?.[
          "Gene-ref_locus"
        ] || query;

      const name =
        gene?.Entrezgene_gene?.["Gene-ref"]?.[
          "Gene-ref_desc"
        ] || "Unknown";

      ncbiGene = {
        id: geneId,
        symbol,
        name,
        organism,
        type: geneType,
      };
    }
  } catch (error) {
    console.error("NCBI error:", error);
  }

  // ==========================================
  // 2. UNIPROT
  // ==========================================

  let uniProt = null;

  try {
    const uniProtResponse = await fetch(
      `https://rest.uniprot.org/uniprotkb/search?query=gene:${encodeURIComponent(
        query
      )}%20AND%20organism_id:9606%20AND%20reviewed:true&format=json&size=1`,
      {
        cache: "no-store",
      }
    );

    if (!uniProtResponse.ok) {
      throw new Error("UniProt request failed");
    }

    const uniProtData = await uniProtResponse.json();

    const uniProtResult =
      uniProtData.results?.[0];

    if (uniProtResult) {
      uniProt = {
        accession:
          uniProtResult.primaryAccession || null,

        id:
          uniProtResult.uniProtkbId || null,

        entryType:
          uniProtResult.entryType || null,

        proteinName:
          uniProtResult.proteinDescription
            ?.recommendedName
            ?.fullName
            ?.value || null,

        organism:
          uniProtResult.organism
            ?.scientificName || null,
      };
    }
  } catch (error) {
    console.error("UniProt error:", error);
  }

  // ==========================================
  // 3. PUBMED
  // ==========================================

  let pubmed = [];

  try {
    const pubmedSearchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
        query
      )}&retmode=json&retmax=5`,
      {
        cache: "no-store",
      }
    );

    if (!pubmedSearchResponse.ok) {
      throw new Error("PubMed search request failed");
    }

    const pubmedSearchData =
      await pubmedSearchResponse.json();

    const pubmedIds =
      pubmedSearchData.esearchresult?.idlist || [];

    if (pubmedIds.length > 0) {
      const pubmedSummaryResponse = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pubmedIds.join(
          ","
        )}&retmode=json`,
        {
          cache: "no-store",
        }
      );

      if (!pubmedSummaryResponse.ok) {
        throw new Error(
          "PubMed summary request failed"
        );
      }

      const pubmedSummaryData =
        await pubmedSummaryResponse.json();

      pubmed = pubmedIds.map((id: string) => {
        const article =
          pubmedSummaryData.result?.[id];

        return {
          pmid: id,
          title: article?.title || "Unknown",
          pubDate: article?.pubdate || "Unknown",
        };
      });
    }
  } catch (error) {
    console.error("PubMed error:", error);

    pubmed = [];
  }

  // ==========================================
  // 4. RCSB PDB SEARCH
  // ==========================================

  let pdb = [];

  try {
    const rcsbSearchBody = {
      query: {
        type: "terminal",
        service: "text",
        parameters: {
          attribute:
            "rcsb_entity_source_organism.rcsb_gene_name.value",
          operator: "exact_match",
          value: query,
        },
      },
      return_type: "entry",
      request_options: {
        paginate: {
          start: 0,
          rows: 10,
        },
      },
    };

    const rcsbSearchResponse = await fetch(
      "https://search.rcsb.org/rcsbsearch/v2/query",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rcsbSearchBody),
        cache: "no-store",
      }
    );

    if (!rcsbSearchResponse.ok) {
      throw new Error("RCSB search request failed");
    }

    const rcsbSearchData =
      await rcsbSearchResponse.json();

    const pdbIds =
      rcsbSearchData.result_set?.map(
        (item: { identifier: string }) =>
          item.identifier
      ) || [];

    // ==========================================
    // 5. RCSB PDB DETAILS
    // ==========================================

    if (pdbIds.length > 0) {
      const pdbResults = await Promise.all(
        pdbIds.map(async (pdbId: string) => {
          try {
            const pdbResponse = await fetch(
              `https://data.rcsb.org/rest/v1/core/entry/${pdbId}`,
              {
                cache: "no-store",
              }
            );

            if (!pdbResponse.ok) {
              throw new Error(
                `RCSB detail request failed for ${pdbId}`
              );
            }

            const pdbData =
              await pdbResponse.json();

            const citation =
              pdbData.rcsb_primary_citation;

            return {
              pdbId,

              title:
                pdbData.struct?.title ||
                "Unknown",

              experimentalMethod:
                pdbData.exptl?.[0]?.method ||
                pdbData.rcsb_entry_info
                  ?.experimental_method ||
                "Unknown",

              resolution:
                pdbData.rcsb_entry_info
                  ?.diffrn_resolution_high ||
                null,

              citationTitle:
                citation?.title ||
                null,

              citationYear:
                citation?.year ||
                null,

              doi:
                pdbData.database_2?.find(
                  (item: {
                    database_id?: string;
                  }) =>
                    item.database_id === "PDB"
                )?.pdbx_database_accession ||
                null,

              pubmedId:
                pdbData.rcsb_entry_container_identifiers
                  ?.pubmed_ids?.[0] ||
                null,

              url: `https://www.rcsb.org/structure/${pdbId}`,
            };
          } catch (error) {
            console.error(
              `RCSB detail error (${pdbId}):`,
              error
            );

            return null;
          }
        })
      );

      pdb = pdbResults.filter(
        (item) => item !== null
      );
    }
  } catch (error) {
    console.error("RCSB error:", error);

    pdb = [];
  }

  // ==========================================
  // 6. BİRLEŞTİRİLMİŞ SONUÇ
  // ==========================================

  return NextResponse.json({
    query,

    sources: {
      ncbi: ncbiGene,
      uniprot: uniProt,
      pubmed,
      pdb,
    },
  });
}