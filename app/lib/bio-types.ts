export type BioSource =
  | "ncbi"
  | "uniprot"
  | "pubmed"
  | "pdb"
  | "crossref";

export type BioIdentifierSource = BioSource | "ensembl";

export type BioIdentifierType =
  | "ncbi_gene_id"
  | "uniprot_accession"
  | "pdb_id"
  | "pmid"
  | "doi"
  | "ensembl_id"
  | "refseq_accession";

export type BioIdentifier = {
  source: BioIdentifierSource;
  type: BioIdentifierType;
  value: string;
};

export type BioRelationshipType =
  | "protein_to_gene"
  | "gene_to_protein"
  | "protein_to_structure"
  | "structure_to_protein"
  | "publication_to_structure"
  | "publication_to_doi"
  | "doi_to_publication"
  | "structure_to_publication"
  | "structure_to_doi"
  | "doi_to_structure";

export type BioRelationship = {
  type: BioRelationshipType;
  target: BioIdentifier;
};

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
  crossReferences?: BioIdentifier[];
  accession: string | null;
  id: string | null;
  entryType: string | null;
  proteinName: string | null;
  organism: string | null;
};

export type BioPublication = {
  entityType: "publication";
  source: "pubmed";
  crossReferences?: BioIdentifier[];
  pmid: string;
  title: string;
  pubDate: string;
};

export type BioStructure = {
  entityType: "structure";
  source: "pdb";
  crossReferences?: BioIdentifier[];
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

export type BioLinkedEntity = {
  primary: BioEntity;
  identifiers: BioIdentifier[];
  relatedEntities: BioEntity[];
  relationships: BioRelationship[];
};