import Link from "next/link";
import { notFound } from "next/navigation";
import { searchCrossref } from "@/app/lib/sources/crossref";
import { getDoiPath } from "@/app/lib/internal-routes";

type DoiPageProps = {
  params: Promise<{ doi: string[] }>;
};

function MetadataField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "Not available"}
      </dd>
    </div>
  );
}

export default async function DoiPage({ params }: DoiPageProps) {
  const { doi: doiSegments } = await params;
  const doi = doiSegments.join("/");

  if (!/^10\.\d{4,9}\/\S+$/i.test(doi)) {
    notFound();
  }

  let record;
  let loadFailed = false;

  try {
    record = await searchCrossref(doi);
  } catch {
    loadFailed = true;
  }

  if (!record && !loadFailed) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f2f6f3] text-[#192720]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-7 sm:py-12">
        <header className="flex items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
          <Link href="/" className="font-serif text-xl font-semibold">
            BioPlatform
          </Link>
          <Link
            href={`/search?q=${encodeURIComponent(doi)}`}
            className="text-sm font-medium text-emerald-800 underline underline-offset-4 hover:text-emerald-950"
          >
            Back to search
          </Link>
        </header>

        {loadFailed || !record ? (
          <section role="alert" className="mt-10 border-l-4 border-rose-600 bg-rose-50 px-5 py-4 text-rose-900">
            <h1 className="font-semibold">DOI metadata unavailable</h1>
            <p className="mt-1 break-all text-sm">
              Crossref could not load metadata for {doi}. Please try again later.
            </p>
          </section>
        ) : (
          <article className="pt-10">
            <p className="text-xs font-semibold uppercase text-rose-800">
              Crossref publication
            </p>
            <h1 className="mt-3 break-words font-serif text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              {record.title || "Title not available"}
            </h1>
            <Link
              href={getDoiPath(record.doi)}
              className="mt-4 inline-block break-all font-mono text-sm font-semibold text-rose-800 underline underline-offset-4 hover:text-rose-950"
            >
              {record.doi}
            </Link>
            <dl className="mt-8 grid gap-6 border-y border-emerald-950/10 py-6 sm:grid-cols-2">
              <MetadataField label="Work type" value={record.workType} />
              <MetadataField label="Publisher" value={record.publisher} />
              <MetadataField label="Journal" value={record.journal} />
              <MetadataField
                label="Published"
                value={record.published?.join("-") || null}
              />
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Authors</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                  {record.authors
                    .map((author) =>
                      [author.given, author.family].filter(Boolean).join(" ")
                    )
                    .filter(Boolean)
                    .join(", ") || "Not available"}
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-xs text-slate-500">Source: Crossref</p>
          </article>
        )}
      </div>
    </main>
  );
}