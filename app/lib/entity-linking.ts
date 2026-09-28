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
    case "protein": {
      const identifiers: BioIdentifier[] = [...(entity.crossReferences || [])];
      if (entity.accession) {
        identifiers.unshift({
          source: "uniprot",
          type: "uniprot_accession",
          value: entity.accession,
        });
      }
      return identifiers;
    }
    case "publication":
      return [
        { source: "pubmed", type: "pmid", value: entity.pmid },
        ...(entity.crossReferences || []),
      ];
    case "structure":
      return [
        { source: "pdb", type: "pdb_id", value: entity.pdbId },
        ...(entity.crossReferences || []),
      ];
    case "doi":
      return [{ source: "crossref", type: "doi", value: entity.doi }];
  }
}

function getSourceRelationships(entity: BioEntity): BioRelationship[] {
  const relationships: BioRelationship[] = [];

  if (entity.entityType === "protein") {
    for (const reference of entity.crossReferences || []) {
      if (reference.type === "ncbi_gene_id") {
        relationships.push({ type: "protein_to_gene", target: reference });
      }
    }
  }

  if (entity.entityType === "publication") {
    for (const reference of entity.crossReferences || []) {
      if (reference.type === "doi") {
        relationships.push({ type: "publication_to_doi", target: reference });
      }
    }
  }

  if (entity.entityType === "structure") {
    for (const reference of entity.crossReferences || []) {
      if (reference.type === "uniprot_accession") {
        relationships.push({
          type: "structure_to_protein",
          target: reference,
        });
      }
    }

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
  }

  return relationships;
}

function getReverseRelationship(
  sourceEntity: BioEntity,
  relationship: BioRelationship
): BioRelationship | null {
  if (
    relationship.type === "protein_to_gene" &&
    sourceEntity.entityType === "protein" &&
    sourceEntity.accession
  ) {
    return {
      type: "gene_to_protein",
      target: {
        source: "uniprot",
        type: "uniprot_accession",
        value: sourceEntity.accession,
      },
    };
  }

  if (
    relationship.type === "structure_to_protein" &&
    sourceEntity.entityType === "structure"
  ) {
    return {
      type: "protein_to_structure",
      target: { source: "pdb", type: "pdb_id", value: sourceEntity.pdbId },
    };
  }

  if (
    relationship.type === "structure_to_publication" &&
    sourceEntity.entityType === "structure"
  ) {
    return {
      type: "publication_to_structure",
      target: { source: "pdb", type: "pdb_id", value: sourceEntity.pdbId },
    };
  }

  if (
    relationship.type === "publication_to_doi" &&
    sourceEntity.entityType === "publication"
  ) {
    return {
      type: "doi_to_publication",
      target: { source: "pubmed", type: "pmid", value: sourceEntity.pmid },
    };
  }

  if (
    relationship.type === "structure_to_doi" &&
    sourceEntity.entityType === "structure"
  ) {
    return {
      type: "doi_to_structure",
      target: { source: "pdb", type: "pdb_id", value: sourceEntity.pdbId },
    };
  }

  return null;
}

function identifiersMatch(left: BioIdentifier, right: BioIdentifier): boolean {
  return (
    left.source === right.source &&
    left.type === right.type &&
    left.value === right.value
  );
}

function relationshipsMatch(
  left: BioRelationship,
  right: BioRelationship
): boolean {
  return left.type === right.type && identifiersMatch(left.target, right.target);
}

export function createBioLinkedEntity(
  primary: BioEntity,
  candidates: readonly BioEntity[]
): BioLinkedEntity {
  const primaryIdentifiers = getBioIdentifiers(primary);
  const relationships = getSourceRelationships(primary);
  const relatedEntities: BioEntity[] = [];

  for (const candidate of candidates) {
    const candidateIdentifiers = getBioIdentifiers(candidate);
    const directRelationships = relationships.filter((relationship) =>
      candidateIdentifiers.some((identifier) =>
        identifiersMatch(identifier, relationship.target)
      )
    );
    const reverseRelationships = getSourceRelationships(candidate)
      .filter((relationship) =>
        primaryIdentifiers.some((identifier) =>
          identifiersMatch(identifier, relationship.target)
        )
      )
      .flatMap((relationship) => {
        const reverse = getReverseRelationship(candidate, relationship);
        return reverse ? [reverse] : [];
      });

    if (directRelationships.length > 0 || reverseRelationships.length > 0) {
      relatedEntities.push(candidate);
      relationships.push(...directRelationships, ...reverseRelationships);
    }
  }

  const publications = candidates.filter(
    (entity) => entity.entityType === "publication"
  );
  const structures = candidates.filter(
    (entity) => entity.entityType === "structure"
  );

  for (const publication of publications) {
    for (const structure of structures) {
      if (structure.pubmedId !== publication.pmid) {
        continue;
      }

      relationships.push(
        {
          type: "publication_to_structure",
          target: {
            source: "pdb",
            type: "pdb_id",
            value: structure.pdbId,
          },
        },
        {
          type: "structure_to_publication",
          target: {
            source: "pubmed",
            type: "pmid",
            value: publication.pmid,
          },
        }
      );
    }
  }

  return {
    primary,
    identifiers: getBioIdentifiers(primary),
    relatedEntities,
    relationships: relationships.filter(
      (relationship, index) =>
        relationships.findIndex((candidate) =>
          relationshipsMatch(candidate, relationship)
        ) === index
    ),
  };
}