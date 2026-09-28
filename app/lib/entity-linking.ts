import type {
  BioEntity,
  BioIdentifier,
  BioLinkedEntity,
  BioRelationship,
} from "@/app/lib/bio-types";

export function getBioIdentifiers(entity: BioEntity): BioIdentifier[] {
  switch (entity.entityType) {
    case "gene":
      return entity.id
        ? [{ source: "ncbi", type: "ncbi_gene_id", value: entity.id }]
        : [];
    case "protein":
      return entity.accession
        ? [
            {
              source: "uniprot",
              type: "uniprot_accession",
              value: entity.accession,
            },
          ]
        : [];
    case "publication":
      return [{ source: "pubmed", type: "pmid", value: entity.pmid }];
    case "structure":
      return [{ source: "pdb", type: "pdb_id", value: entity.pdbId }];
    case "doi":
      return [{ source: "crossref", type: "doi", value: entity.doi }];
  }
}

function getSourceRelationships(entity: BioEntity): BioRelationship[] {
  if (entity.entityType !== "structure") {
    return [];
  }

  const relationships: BioRelationship[] = [];

  if (entity.pubmedId) {
    relationships.push({
      type: "structure_to_publication",
      target: { source: "pubmed", type: "pmid", value: entity.pubmedId },
    });
  }

  if (entity.doi) {
    relationships.push({
      type: "structure_to_doi",
      target: { source: "crossref", type: "doi", value: entity.doi },
    });
  }

  return relationships;
}

export function createBioLinkedEntity(
  primary: BioEntity,
  candidates: readonly BioEntity[]
): BioLinkedEntity {
  const relationships = getSourceRelationships(primary);
  const relatedEntities = candidates.filter((candidate) =>
    relationships.some((relationship) =>
      getBioIdentifiers(candidate).some(
        (identifier) =>
          identifier.source === relationship.target.source &&
          identifier.type === relationship.target.type &&
          identifier.value === relationship.target.value
      )
    )
  );

  return {
    primary,
    identifiers: getBioIdentifiers(primary),
    relatedEntities,
    relationships,
  };
}