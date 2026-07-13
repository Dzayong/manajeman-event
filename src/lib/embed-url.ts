/**
 * Google Docs, Canva, and Figma each expose an official view-only embed
 * endpoint that allows iframe framing — unlike their normal edit URLs
 * (or arbitrary third-party sites), which block embedding for security.
 * Editing still has to happen on the original platform; this only
 * covers read-only viewing inside our own preview dialog.
 */
export function getEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname === "docs.google.com") {
    const match = parsed.pathname.match(
      /^\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/,
    );
    if (!match) return null;
    const [, kind, id] = match;
    const suffix = kind === "presentation" ? "embed" : "preview";
    return `https://docs.google.com/${kind}/d/${id}/${suffix}`;
  }

  if (parsed.hostname.endsWith("canva.com") && parsed.pathname.includes("/design/")) {
    const base = `${parsed.origin}${parsed.pathname}`.replace(/\/(edit|view)\/?$/, "");
    return `${base}/view?embed`;
  }

  if (parsed.hostname.endsWith("figma.com")) {
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
  }

  return null;
}
