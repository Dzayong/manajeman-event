import { marked } from "marked";

/**
 * Report bodies are markdown: written by the AI, then edited by hand in the
 * draft textarea. Raw HTML is never legitimate content for an LPJ, and
 * rendering it as-is would let anyone who can edit a report inject script
 * that runs for everyone else who opens it. Angle brackets are therefore
 * neutralised before parsing instead of being passed through.
 */
function neutralizeHtml(markdown: string): string {
  return markdown.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Markdown -> HTML for the print/PDF view and the Word export. */
export function renderReportHtml(markdown: string): string {
  return marked.parse(neutralizeHtml(markdown), {
    async: false,
    gfm: true, // tables -- an LPJ's "Realisasi Anggaran" is a markdown table
    breaks: false,
  }) as string;
}
