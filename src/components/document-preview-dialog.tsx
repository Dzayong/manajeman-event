"use client";

import { ExternalLink, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEmbedUrl } from "@/lib/embed-url";

export type PreviewableDoc = { title: string; url: string } | null;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const PDF_EXT = /\.pdf$/i;

function getKind(url: string): "image" | "pdf" | "embed" | "other" {
  if (IMAGE_EXT.test(url)) return "image";
  if (PDF_EXT.test(url)) return "pdf";
  if (getEmbedUrl(url)) return "embed";
  return "other";
}

/** Files we host ourselves preview directly. Google Docs/Canva/Figma links
 * use their official view-only embed endpoints. Anything else can't be
 * embedded reliably (most sites block iframes via X-Frame-Options), so it
 * keeps opening in a new tab instead of using this dialog. */
export function DocumentPreviewDialog({
  doc,
  onOpenChange,
}: {
  doc: PreviewableDoc;
  onOpenChange: (open: boolean) => void;
}) {
  const kind = doc ? getKind(doc.url) : "other";
  const embedUrl = doc && kind === "embed" ? getEmbedUrl(doc.url) : null;

  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{doc?.title}</DialogTitle>
        </DialogHeader>
        {doc && kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.url}
            alt={doc.title}
            className="max-h-[70vh] w-full rounded-md border object-contain"
          />
        )}
        {doc && kind === "pdf" && (
          <iframe
            src={doc.url}
            title={doc.title}
            className="h-[70vh] w-full rounded-md border"
          />
        )}
        {doc && kind === "embed" && embedUrl && (
          <iframe
            src={embedUrl}
            title={doc.title}
            className="h-[70vh] w-full rounded-md border"
            allow="fullscreen"
          />
        )}
        {doc && kind === "other" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <FileWarning className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              Pratinjau tidak tersedia untuk dokumen ini.
            </p>
          </div>
        )}
        {doc && (
          <div className="flex items-center justify-between gap-3">
            {kind === "embed" ? (
              <p className="text-xs text-slate-500">
                Mode lihat saja. Kalau kosong/gagal muat, pastikan dokumen
                dibagikan sebagai &quot;siapa saja dengan tautan dapat
                melihat&quot;.
              </p>
            ) : (
              <span />
            )}
            <Button variant="outline" asChild className="shrink-0">
              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" />
                {kind === "embed" ? "Buka & edit" : "Buka di tab baru"}
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
