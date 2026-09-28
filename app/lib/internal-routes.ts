export function getDoiPath(doi: string): string {
  return `/doi/${doi.split("/").map(encodeURIComponent).join("/")}`;
}