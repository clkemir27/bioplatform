import Link from "next/link";
import { notFound } from "next/navigation";
import { searchPubMed } from "@/app/lib/sources/pubmed";
import { getDoiPath } from "@/app/lib/internal-routes";

type PublicationPageProps = {
  params: Promise<{ pmid: string }>;
};

export default async function PublicationPage({
  params,
}: PublicationPageProps) {
  const { pmid } = await params;

  if (!/^\d+$/.test(pmid)) {
    notFound();
  }

  let publication;
  let loadFailed = false;

  try {
    publication = (await searchPubMed(pmid, "pmid"))[0];
  } catch {
    loadFailed = true;
  }

  if (!publication && !loadFailed) {
    notFound();
  }

  const doi = publication?.crossReferences?.find(
    (reference) => reference.type === "doi"
  )?.value;

  return (
    <main className="min-h-screen bg-[#f2f6f3] text-[#192720]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-7 sm:py-12">
        <header className="flex items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
          <Link href="/" className="font-serif text-xl font-semibold">
            BioPlatform
          </Link>
          <Link
            href={`/search?q=${encodeURIComponent(pmid)}`}
            className="text-sm font-medium text-emerald-800 underline underline-offset-4 hover:text-emerald-950"
          >
            Back to search
          </Link>
        </header>

        {loadFailed || !publication ? (
          <section role="alert" className="mt-10 border-l-4 border-rose-600 bg-rose-50 px-5 py-4 text-rose-900">
            <h1 className="font-semibold">Publication unavailable</h1>
            <p className="mt-1 text-sm">
              PubMed could not load publication {pmid}. Please try again later.
            </p>
          </section>
        ) : (
          <article className="pt-10">
            <p className="text-xs font-semibold uppercase text-emerald-800">
              PubMed publication
            </p>
            <h1 className="mt-3 break-words font-serif text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              {publication.title}
            </h1>
            <dl className="mt-8 grid gap-6 border-y border-emerald-950/10 py-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">PMID</dt>
                <dd className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
                  {publication.pmid}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Published</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {publication.pubDate}
                </dd>
              </div>
              {doi && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">DOI</dt>
                  <dd className="mt-1 break-all text-sm font-semibold">
                    <Link
                      href={getDoiPath(doi)}
                      className="text-emerald-800 underline underline-offset-4 hover:text-emerald-950"
                    >
                      {doi}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-5 text-xs text-slate-500">Source: PubMed</p>
          </article>
        )}
      </div>
    </main>
  );
}