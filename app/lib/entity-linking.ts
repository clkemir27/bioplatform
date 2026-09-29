import type {
  BioEntity,
  BioIdentifier,
  BioLinkedEntity,
  BioRelationship,
} from "@/app/lib/bio-types";

export function getBioIdentifiers(entity: BioEntity): BioIdentifier[] {
  switch (entity.entityType) {
    case "gene":
      if (entity.source === "ensembl") {
        return [
          {
            source: "ensembl",
            type: "ensembl_id",
            value: entity.id,
          },
          ...entity.crossReferences,
        ];
      }

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
      if (
        reference.source === "ncbi" &&
        reference.type === "ncbi_gene_id"
      ) {
        relationships.push({ type: "protein_to_gene", target: reference });
      }

      if (
        entity.source === "hpa" &&
        reference.source === "ensembl" &&
        reference.type === "ensembl_id"
      ) {
        relationships.push({ type: "protein_to_gene", target: reference });
      }
    }
  }

  if (entity.entityType === "publication") {
    for (const reference of entity.crossReferences || []) {
      if (
        reference.source === "crossref" &&
        reference.type === "doi"
      ) {
        relationships.push({ type: "publication_to_doi", target: reference });
      }
    }
  }

  if (entity.entityType === "structure") {
    for (const reference of entity.crossReferences || []) {
      if (
        reference.source === "uniprot" &&
        reference.type === "uniprot_accession"
      ) {
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
  const leftValue = left.type === "doi" ? left.value.toLowerCase() : left.value;
  const rightValue = right.type === "doi" ? right.value.toLowerCase() : right.value;

  return (
    left.source === right.source &&
    left.type === right.type &&
    leftValue === rightValue
  );
}

function getRelationshipsBetween(
  sourceEntity: BioEntity,
  candidateEntity: BioEntity
): BioRelationship[] {
  const sourceIdentifiers = getBioIdentifiers(sourceEntity);
  const candidateIdentifiers = getBioIdentifiers(candidateEntity);
  const directRelationships = getSourceRelationships(sourceEntity).filter(
    (relationship) =>
      candidateIdentifiers.some((identifier) =>
        identifiersMatch(identifier, relationship.target)
      )
  );
  const directReverseRelationships = directRelationships.flatMap(
    (relationship) => {
      const reverse = getReverseRelationship(sourceEntity, relationship);
      return reverse ? [reverse] : [];
    }
  );
  const candidateRelationships = getSourceRelationships(candidateEntity)
    .filter((relationship) =>
      sourceIdentifiers.some((identifier) =>
        identifiersMatch(identifier, relationship.target)
      )
    );
  const candidateReverseRelationships = candidateRelationships.flatMap(
    (relationship) => {
      const reverse = getReverseRelationship(candidateEntity, relationship);
      return reverse ? [reverse] : [];
    }
  );

  return [
    ...directRelationships,
    ...directReverseRelationships,
    ...candidateRelationships,
    ...candidateReverseRelationships,
  ];
}

function genesShareIdentifier(
  left: BioEntity,
  right: BioEntity
): boolean {
  if (left.entityType !== "gene" || right.entityType !== "gene") {
    return false;
  }

  const leftIdentifiers = getBioIdentifiers(left);
  const rightIdentifiers = getBioIdentifiers(right);

  return leftIdentifiers.some((leftIdentifier) =>
    rightIdentifiers.some((rightIdentifier) =>
      identifiersMatch(leftIdentifier, rightIdentifier)
    )
  );
}

function hpaAndUniProtShareIdentifier(
  left: BioEntity,
  right: BioEntity
): boolean {
  const hpaEntity = left.source === "hpa" ? left : right.source === "hpa" ? right : null;
  const uniProtEntity = left.source === "uniprot" ? left : right.source === "uniprot" ? right : null;

  if (!hpaEntity || !uniProtEntity) {
    return false;
  }

  const hpaIdentifiers = getBioIdentifiers(hpaEntity);
  const uniProtIdentifiers = getBioIdentifiers(uniProtEntity);

  return hpaIdentifiers.some(
    (hpaIdentifier) =>
      hpaIdentifier.source === "uniprot" &&
      hpaIdentifier.type === "uniprot_accession" &&
      uniProtIdentifiers.some((uniProtIdentifier) =>
        identifiersMatch(hpaIdentifier, uniProtIdentifier)
      )
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
  const relationships = getSourceRelationships(primary);
  const relatedEntities: BioEntity[] = [];

  for (const candidate of candidates) {
    const candidateRelationships = getRelationshipsBetween(primary, candidate);

    if (
      candidateRelationships.length > 0 ||
      genesShareIdentifier(primary, candidate) ||
      hpaAndUniProtShareIdentifier(primary, candidate)
    ) {
      relatedEntities.push(candidate);
      relationships.push(...candidateRelationships);
    }
  }

  for (let sourceIndex = 0; sourceIndex < candidates.length; sourceIndex += 1) {
    const sourceEntity = candidates[sourceIndex];

    for (
      let candidateIndex = sourceIndex + 1;
      candidateIndex < candidates.length;
      candidateIndex += 1
    ) {
      const candidateEntity = candidates[candidateIndex];
      relationships.push(
        ...getRelationshipsBetween(sourceEntity, candidateEntity)
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