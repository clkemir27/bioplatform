import { XMLParser } from "fast-xml-parser";

import type { InputType } from "@/app/lib/input-classifier";

export type SequenceSearchInputType = Extract<
  InputType,
  "dna" | "protein_sequence"
>;

type BlastConfiguration = {
  program: "blastn" | "blastp";
  sequenceType: "dna" | "protein";
  database: string;
};

export type SequenceSearchJob = {
  jobId: string;
};

export type SequenceSearchStatus = SequenceSearchJob & {
  status: string;
};

export type SequenceSearchResults = SequenceSearchJob & {
  resultType: string;
  availableResultTypes: string[];
  contentType: string | null;
  rawResult: string;
};

const SERVICE_URL =
  "https://www.ebi.ac.uk/Tools/services/rest/ncbiblast";

const DNA_SEQUENCE_PATTERN = /^[ACGTRYSWKMBDHVN]+$/i;

const PROTEIN_SEQUENCE_PATTERN =
  /^[ACDEFGHIKLMNPQRSTVWYBXZJUO]+$/i;

const JOB_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function getBlastConfiguration(
  inputType: SequenceSearchInputType
): BlastConfiguration {
  if (inputType === "dna") {
    return {
      program: "blastn",
      sequenceType: "dna",
      database: "em_all",
    };
  }

  return {
    program: "blastp",
    sequenceType: "protein",
    database: "uniprotkb_swissprot",
  };
}

function prepareFastaSequence(
  input: string,
  inputType: SequenceSearchInputType
): string {
  const lines = input
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headerLines = lines.filter((line) => line.startsWith(">"));

  if (
    headerLines.length > 1 ||
    (headerLines.length === 1 && !lines[0].startsWith(">"))
  ) {
    throw new Error("Only one FASTA sequence can be submitted at a time");
  }

  const sequence = lines
    .filter((line) => !line.startsWith(">"))
    .join("")
    .replace(/\s+/g, "")
    .toUpperCase();

  if (!sequence) {
    throw new Error("Sequence is required");
  }

  const validSequence =
    inputType === "dna"
      ? DNA_SEQUENCE_PATTERN.test(sequence)
      : PROTEIN_SEQUENCE_PATTERN.test(sequence);

  if (!validSequence) {
    throw new Error(
      inputType === "dna"
        ? "DNA sequence contains unsupported nucleotide characters"
        : "Protein sequence contains unsupported amino-acid characters"
    );
  }

  return `>BioPlatform-query\n${sequence}`;
}

function normalizeJobId(jobId: string): string {
  const normalizedJobId = jobId.trim();

  if (
    !normalizedJobId ||
    !JOB_ID_PATTERN.test(normalizedJobId)
  ) {
    throw new Error("Invalid EMBL-EBI BLAST job ID");
  }

  return normalizedJobId;
}

async function requestText(
  url: string,
  action: string,
  init?: RequestInit
): Promise<{ response: Response; text: string }> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "User-Agent": "BioPlatform/1.0 (bioinformatics sequence search)",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      `Unable to reach EMBL-EBI BLAST to ${action}`
    );
  }

  const text = await response.text();

  if (!response.ok) {
    const errorBody = text.trim();
    throw new Error(
      `EMBL-EBI BLAST ${action} failed with HTTP ${response.status}${
        errorBody ? `: ${errorBody}` : ""
      }`
    );
  }

  return {
    response,
    text,
  };
}

function findResultTypeIdentifiers(
  value: unknown,
  identifiers: string[] = []
): string[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      findResultTypeIdentifiers(item, identifiers);
    }

    return identifiers;
  }

  if (!value || typeof value !== "object") {
    return identifiers;
  }

  const record = value as Record<string, unknown>;

  const identifier = record.identifier;

  if (
    typeof identifier === "string" &&
    identifier.trim()
  ) {
    identifiers.push(identifier.trim());
  }

  for (const [key, child] of Object.entries(record)) {
    if (key !== "identifier") {
      findResultTypeIdentifiers(child, identifiers);
    }
  }

  return identifiers;
}

export async function submitSequenceSearch(
  input: string,
  inputType: SequenceSearchInputType,
  email: string
): Promise<SequenceSearchJob> {
  const normalizedEmail = email.trim();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail
    )
  ) {
    throw new Error(
      "A valid email address is required by EMBL-EBI BLAST"
    );
  }

  const configuration = getBlastConfiguration(inputType);

  const sequence = prepareFastaSequence(
    input,
    inputType
  );

  const form = new URLSearchParams({
    email: normalizedEmail,
    program: configuration.program,
    stype: configuration.sequenceType,
    database: configuration.database,
    sequence,
  });

  const { text } = await requestText(
    `${SERVICE_URL}/run`,
    "job submission",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: form,
    }
  );

  const jobId = text.trim();

  if (!jobId) {
    throw new Error(
      "EMBL-EBI BLAST returned an empty job ID"
    );
  }

  return {
    jobId,
  };
}

export async function getSequenceSearchStatus(
  jobId: string
): Promise<SequenceSearchStatus> {
  const normalizedJobId = normalizeJobId(jobId);

  const { text } = await requestText(
    `${SERVICE_URL}/status/${normalizedJobId}`,
    "status lookup"
  );

  const status = text.trim();

  if (!status) {
    throw new Error(
      "EMBL-EBI BLAST returned an empty job status"
    );
  }

  return {
    jobId: normalizedJobId,
    status,
  };
}

export async function getSequenceSearchResults(
  jobId: string,
  requestedResultType?: string
): Promise<SequenceSearchResults> {
  const normalizedJobId = normalizeJobId(jobId);

  const { status } = await getSequenceSearchStatus(
    normalizedJobId
  );

  if (status !== "FINISHED") {
    throw new Error(
      `EMBL-EBI BLAST job is not finished (status: ${status})`
    );
  }

  const {
    text: resultTypesText,
  } = await requestText(
    `${SERVICE_URL}/resulttypes/${normalizedJobId}`,
    "result type lookup",
    {
      headers: {
        Accept: "application/xml",
      },
    }
  );

  let resultTypes: unknown;

  try {
    resultTypes = new XMLParser({
      trimValues: true,
    }).parse(resultTypesText);
  } catch {
    throw new Error(
      "Unable to parse EMBL-EBI BLAST result types"
    );
  }

  const availableResultTypes = [
    ...new Set(
      findResultTypeIdentifiers(resultTypes)
    ),
  ];

  const resultType =
    requestedResultType?.trim() ||
    availableResultTypes[0];

  if (
    !resultType ||
    !availableResultTypes.includes(resultType)
  ) {
    throw new Error(
      "EMBL-EBI BLAST did not advertise the requested result type"
    );
  }

  const {
    response,
    text: rawResult,
  } = await requestText(
    `${SERVICE_URL}/result/${normalizedJobId}/${encodeURIComponent(
      resultType
    )}`,
    "result retrieval"
  );

  return {
    jobId: normalizedJobId,
    resultType,
    availableResultTypes,
    contentType:
      response.headers.get("content-type"),
    rawResult,
  };
}