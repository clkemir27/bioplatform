export type InputType =
  | "pdb"
  | "pmid"
  | "doi"
  | "uniprot"
  | "ensembl"
  | "dna"
  | "protein_sequence"
  | "gene"
  | "unknown";

export function classifyInput(input: string): InputType {
  const value = input.trim();

  if (!value) {
    return "unknown";
  }

  // DOI
  const doi = value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  if (/^10\.\d{4,9}\/\S+$/i.test(doi)) {
    return "doi";
  }

  // PDB ID
  if (/^[0-9][A-Za-z0-9]{3}$/.test(value)) {
    return "pdb";
  }

  // PMID
  if (/^\d{1,9}$/.test(value)) {
    return "pmid";
  }

  // UniProt accession
  if (
    /^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9][A-Z0-9]{3}[0-9])$/i.test(
      value
    )
  ) {
    return "uniprot";
  }

  if (isEnsemblGeneId(value)) {
    return "ensembl";
  }

  const sequence = value.replace(/\s+/g, "");

  // DNA sequence
  if (
    /^[ACGTN]+$/i.test(sequence) &&
    sequence.length >= 10
  ) {
    return "dna";
  }

  // Protein sequence
  if (
    /^[ACDEFGHIKLMNPQRSTVWY]+$/i.test(sequence) &&
    sequence.length >= 10
  ) {
    return "protein_sequence";
  }

  // Gene symbol / name
  if (/^[A-Za-z0-9-]+$/.test(value)) {
    return "gene";
  }

  return "unknown";
}

export function isEnsemblGeneId(value: string): boolean {
  return /^ENS(?:[A-Z]{3})?G[0-9]{11}$/i.test(value);
}