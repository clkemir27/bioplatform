import { XMLParser } from "fast-xml-parser";

import type {
  BioSequenceHit,
  BioSequenceSearchResult,
} from "@/app/lib/bio-types";
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

class BlastHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "BlastHttpError";
  }
}

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
    throw new BlastHttpError(
      `EMBL-EBI BLAST ${action} failed with HTTP ${response.status}${
        errorBody ? `: ${errorBody}` : ""
      }`,
      response.status
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

  let resultTypesText: string;

  try {
    const resultTypesResponse = await requestText(
      `${SERVICE_URL}/resulttypes/${normalizedJobId}`,
      "result type lookup",
      {
        headers: {
          Accept: "application/xml",
        },
      },
    );
    resultTypesText = resultTypesResponse.text;
  } catch (error) {
    if (error instanceof BlastHttpError && error.status === 500) {
      throw new Error(
        "EMBL-EBI BLAST result type lookup temporarily failed with HTTP 500. " +
          "The job status is unchanged; please retry retrieving results later."
      );
    }

    throw error;
  }

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

type BlastDefline = Pick<
  BioSequenceHit,
  "accession" | "description" | "organism"
>;

function parseBlastNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBlastDefline(hitSection: string): BlastDefline {
  const firstLine = hitSection.split(/\r?\n/, 1)[0] || "";

  if (!firstLine.startsWith(">")) {
    return {
      accession: "",
      description: "",
      organism: null,
    };
  }

  const defline = firstLine.slice(1).trim();
  const firstWhitespace = defline.search(/\s/);
  const accession =
    firstWhitespace < 0 ? defline : defline.slice(0, firstWhitespace);
  const description =
    firstWhitespace < 0 ? "" : defline.slice(firstWhitespace).trim();

  const organismFromOs =
    /\bOS=(.+?)(?=\s+(?:OX|GN|PE|SV)=|$)/i.exec(
      description
    )?.[1]?.trim();

  const organismMatches = [
    ...description.matchAll(/\[([^\]]+)\]/g),
  ];
  const organismFromBrackets = organismMatches.at(-1)?.[1];

  return {
    accession,
    description,
    organism: organismFromOs || organismFromBrackets || null,
  };
}

function getFirstBlastAlignment(hitSection: string): string {
  const scoreLines = [
    ...hitSection.matchAll(/^[ \t]+Score\s*=/gim),
  ];
  const firstScoreIndex = scoreLines[0]?.index;

  if (firstScoreIndex === undefined) {
    return "";
  }

  return hitSection.slice(firstScoreIndex, scoreLines[1]?.index);
}

function parseAlignmentCoordinates(
  alignment: string,
  label: "Query" | "Sbjct"
): { start: number | null; end: number | null } {
  const pattern = new RegExp(
    `^[ \t]*${label}[ \t]+(\\d+)[ \t]+[A-Za-z*.-]+[ \t]+(\\d+)[ \t]*$`,
    "gim"
  );
  const coordinates: Array<{ start: number; end: number }> = [];
  let match = pattern.exec(alignment);

  while (match) {
    coordinates.push({
      start: Number(match[1]),
      end: Number(match[2]),
    });
    match = pattern.exec(alignment);
  }

  return {
    start: coordinates[0]?.start ?? null,
    end: coordinates.at(-1)?.end ?? null,
  };
}

function parseBlastHit(hitSection: string): BioSequenceHit | null {
  const defline = parseBlastDefline(hitSection);
  const alignment = getFirstBlastAlignment(hitSection);

  if (!defline.accession || !alignment) {
    return null;
  }

  const identities =
    /Identities\s*=\s*(\d+)\/([\d,]+)\s*\(([\d.]+)%\)/i.exec(
      alignment
    );
  const eValue =
    /Expect(?:\(\d+\))?\s*=\s*([0-9]+(?:\.[0-9]+)?(?:[eE][+-]?\d+)?|\.[0-9]+(?:[eE][+-]?\d+)?)/i.exec(
      alignment
    )?.[1];
  const bitScore =
    /Score\s*=\s*([\d.]+)\s+bits\b/i.exec(alignment)?.[1];
  const queryCoordinates = parseAlignmentCoordinates(alignment, "Query");
  const subjectCoordinates = parseAlignmentCoordinates(alignment, "Sbjct");

  return {
    ...defline,
    identityPercent: parseBlastNumber(identities?.[3]),
    alignmentLength: parseBlastNumber(identities?.[2]),
    eValue: parseBlastNumber(eValue),
    bitScore: parseBlastNumber(bitScore),
    queryStart: queryCoordinates.start,
    queryEnd: queryCoordinates.end,
    subjectStart: subjectCoordinates.start,
    subjectEnd: subjectCoordinates.end,
  };
}

export function parseBlastTextResult(
  rawResult: string
): BioSequenceSearchResult {
  let queryLength: number | null = null;
  let database: string | null = null;

  try {
    database =
      /^\s*Database:\s*(\S+)/im.exec(rawResult)?.[1] || null;
    queryLength = parseBlastNumber(
      /^\s*Length\s*=\s*([\d,]+)/im.exec(rawResult)?.[1]
    );

    const hitSections = rawResult
      .split(/(?=^>)/m)
      .filter((section) => section.startsWith(">"));
    const hits = hitSections
      .map(parseBlastHit)
      .filter((hit): hit is BioSequenceHit => hit !== null);

    return {
      queryLength,
      database,
      hits,
      rawResult,
    };
  } catch {
    return {
      queryLength,
      database,
      hits: [],
      rawResult,
    };
  }
}