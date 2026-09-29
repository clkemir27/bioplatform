export type BioSource =
  | "ncbi"
  | "uniprot"
  | "hpa"
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

export type BioEnsemblGene = {
  entityType: "gene";
  source: "ensembl";
  id: string;
  symbol: string | null;
  name: string | null;
  organism: string | null;
  geneType: string | null;
  chromosome: string | null;
  start: number | null;
  end: number | null;
  strand: number | null;
  assemblyName: string | null;
  crossReferences: BioIdentifier[];
};

export type BioHpaProtein = {
  entityType: "protein";
  source: "hpa";
  ensemblId: string;
  geneSymbol: string | null;
  geneDescription: string | null;
  uniprotAccessions: string[];
  chromosome: string | null;
  position: string | null;
  rnaTissueSpecificity: string | null;
  rnaTissueDistribution: string | null;
  rnaTissueSpecificNTPM: Record<string, string> | null;
  proteinTissueSpecificity: string | null;
  proteinTissueDistribution: string | null;
  proteinTissueSpecificIntensity: Record<string, string> | null;
  tissueExpressionCluster: string | null;
  evidence: string | null;
  sourceUrl: string;
  crossReferences: BioIdentifier[];
} & Partial<
    Pick<
      BioProtein,
      "accession" | "id" | "entryType" | "proteinName" | "organism"
    >
  >;

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

export type BioSequenceHit = {
  accession: string;
  description: string;
  organism: string | null;
  identityPercent: number | null;
  alignmentLength: number | null;
  eValue: number | null;
  bitScore: number | null;
  queryStart: number | null;
  queryEnd: number | null;
  subjectStart: number | null;
  subjectEnd: number | null;
};

export type BioSequenceSearchResult = {
  queryLength: number | null;
  database: string | null;
  hits: BioSequenceHit[];
  rawResult: string;
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
  | BioEnsemblGene
  | BioHpaProtein
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