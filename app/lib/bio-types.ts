export type BioSource =
  | "ncbi"
  | "uniprot"
  | "pubmed"
  | "pdb"
  | "crossref";

export type BioEntityType =
  | "gene"
  | "protein"
  | "publication"
  | "structure"
  | "doi";

export type BioAuthor = {
  given: string | null;
  family: string | null;
};

export type BioGene = {
  entityType: "gene";
  source: "ncbi";
  id: string | null;
  symbol: string | null;
  name: string | null;
  organism: string | null;
  geneType: string | null;
};

export type BioProtein = {
  entityType: "protein";
  source: "uniprot";
  accession: string | null;
  id: string | null;
  entryType: string | null;
  proteinName: string | null;
  organism: string | null;
};

export type BioPublication = {
  entityType: "publication";
  source: "pubmed";
  pmid: string;
  title: string;
  pubDate: string;
};

export type BioStructure = {
  entityType: "structure";
  source: "pdb";
  pdbId: string;
  title: string;
  experimentalMethod: string;
  resolution: number | null;
  citationTitle: string | null;
  citationYear: number | null;
  doi: string | null;
  pubmedId: string | null;
  url: string;
};

export type BioDoi = {
  entityType: "doi";
  source: "crossref";
  doi: string;
  title: string | null;
  workType: string | null;
  publisher: string | null;
  journal: string | null;
  published: number[] | null;
  authors: BioAuthor[];
  url: string | null;
};

export type BioEntity =
  | BioGene
  | BioProtein
  | BioPublication
  | BioStructure
  | BioDoi;