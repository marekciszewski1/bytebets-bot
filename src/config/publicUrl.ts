export function getPublicBaseUrl(): string {
  const url = process.env.PUBLIC_BASE_URL ?? "http://localhost:8787";
  return url.replace(/\/$/, "");
}
