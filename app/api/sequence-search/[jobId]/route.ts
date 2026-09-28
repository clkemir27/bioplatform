import { NextResponse } from "next/server";
import { getSequenceSearchStatus } from "@/app/lib/sources/ebi-blast";

type SequenceSearchStatusRouteProps = {
  params: Promise<{ jobId: string }>;
};

export async function GET(
  _request: Request,
  { params }: SequenceSearchStatusRouteProps
) {
  const { jobId } = await params;

  try {
    const result = await getSequenceSearchStatus(jobId);

    return NextResponse.json(
      {
        jobId: result.jobId,
        status: result.status,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Sequence search status lookup failed";
    const status =
      message === "Invalid EMBL-EBI BLAST job ID" ? 400 : 502;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
