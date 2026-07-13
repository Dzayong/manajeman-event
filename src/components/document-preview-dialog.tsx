"use client";

import { ExternalLink, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PreviewableDoc = { title: string; url: string } | null;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const PDF_EXT = /\.pdf$/i;

function getKind(url: string): "image" | "pdf" | "other" {
  if (IMAGE_EXT.test(url)) return "image";
  if (PDF_EXT.test(url)) return "pdf";
  return "other";
}

/** Preview for files we host ourselves. External links can't be embedded
 * reliably (most block iframes via X-Frame-Options), so those keep opening
 * in a new tab instead of using this dialog. */
export function DocumentPreviewDialog({
  doc,
  onOpenChange,
}: {
  doc: PreviewableDoc;
  onOpenChange: (open: boolean) => void;
}) {
  const kind = doc ? getKind(doc.url) : "other";

  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
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
        {doc && kind === "other" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <FileWarning className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              Pratinjau tidak tersedia untuk tipe file ini.
            </p>
          </div>
        )}
        {doc && (
          <div className="flex justify-end">
            <Button variant="outline" asChild>
              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" />
                Buka di tab baru
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
