import { NextResponse } from "next/server";
import {
  submitSequenceSearch,
  type SequenceSearchInputType,
} from "@/app/lib/sources/ebi-blast";

function isSequenceSearchInputType(
  value: unknown
): value is SequenceSearchInputType {
  return value === "dna" || value === "protein_sequence";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isSequenceValidationError(message: string): boolean {
  return (
    message === "Sequence is required" ||
    message ===
      "Only one FASTA sequence can be submitted at a time" ||
    message.startsWith(
      "DNA sequence contains unsupported"
    ) ||
    message.startsWith(
      "Protein sequence contains unsupported"
    )
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Request body must contain valid JSON",
      },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      {
        error:
          "Request body must be a JSON object",
      },
      { status: 400 }
    );
  }

  const sequence = body.sequence;
  const inputType = body.inputType;

  if (
    typeof sequence !== "string" ||
    !sequence.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "sequence must be a non-empty string",
      },
      { status: 400 }
    );
  }

  if (!isSequenceSearchInputType(inputType)) {
    return NextResponse.json(
      {
        error:
          "inputType must be 'dna' or 'protein_sequence'",
      },
      { status: 400 }
    );
  }

  const email = process.env.EBI_EMAIL;

  if (!email?.trim()) {
    return NextResponse.json(
      {
        error:
          "EBI_EMAIL environment variable is not configured",
      },
      { status: 500 }
    );
  }

  try {
    const { jobId } =
      await submitSequenceSearch(
        sequence,
        inputType,
        email
      );

    return NextResponse.json(
      {
        jobId,
        status: "SUBMITTED",
      },
      { status: 202 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Sequence search submission failed";

    const status =
      isSequenceValidationError(message)
        ? 400
        : 502;

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}