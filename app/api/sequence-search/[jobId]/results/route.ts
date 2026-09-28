import { NextResponse } from "next/server";
import { getSequenceSearchResults } from "@/app/lib/sources/ebi-blast";

type SequenceSearchResultsRouteProps = {
  params: Promise<{ jobId: string }>;
};

export async function GET(
  _request: Request,
  { params }: SequenceSearchResultsRouteProps
) {
  const { jobId } = await params;

  try {
    const results = await getSequenceSearchResults(jobId);
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Sequence search result retrieval failed";

    const status =
      message === "Invalid EMBL-EBI BLAST job ID"
        ? 400
        : message.startsWith("EMBL-EBI BLAST job is not finished (status:")
          ? 409
          : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
