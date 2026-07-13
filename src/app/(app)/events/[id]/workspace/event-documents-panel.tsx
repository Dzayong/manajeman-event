"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  addEventLinkDocument,
  deleteEventDocument,
  uploadEventFileDocument,
} from "@/server/actions/event-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DocumentPreviewDialog,
  type PreviewableDoc,
} from "@/components/document-preview-dialog";

type DocumentRow = {
  id: number;
  title: string;
  type: "FILE" | "LINK";
  url: string;
  uploadedBy: string | null;
  createdAt: string;
};

export function EventDocumentsPanel({
  eventId,
  documents,
  canManage,
}: {
  eventId: number;
  documents: DocumentRow[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [previewDoc, setPreviewDoc] = useState<PreviewableDoc>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addEventLinkDocument(eventId, {
        title: linkTitle,
        url: linkUrl,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Dokumen ditambahkan");
      setLinkTitle("");
      setLinkUrl("");
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadEventFileDocument(eventId, formData);
      if (result.error) toast.error(result.error);
      else toast.success(`${file.name} terupload`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDelete(doc: DocumentRow) {
    startTransition(async () => {
      const result = await deleteEventDocument(doc.id);
      if (result.error) toast.error(result.error);
      else toast.success("Dokumen dihapus");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="h-4 w-4" />
          Dokumen administratif
        </CardTitle>
        <p className="text-sm text-slate-500">
          Proposal, surat izin, surat tugas, dan dokumen resmi lain milik
          event — bukan per-divisi.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <form
              onSubmit={handleAddLink}
              className="flex flex-wrap items-center gap-2"
            >
              <Input
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Judul (mis. Proposal kegiatan)"
                className="w-52"
                aria-label="Judul dokumen event"
              />
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://docs.google.com/…"
                className="min-w-56 flex-1"
                aria-label="URL dokumen event"
              />
              <Button
                type="submit"
                size="sm"
                disabled={pending || !linkTitle.trim() || !linkUrl.trim()}
              >
                <Link2 className="mr-1 h-4 w-4" />
                Tempel link
              </Button>
            </form>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFile}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-4 w-4" />
                )}
                Upload file
              </Button>
              <span className="text-xs text-slate-500">Maksimal 10 MB</span>
            </div>
          </div>
        )}

        {documents.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            Belum ada dokumen administratif.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-md border p-2.5"
              >
                {doc.type === "LINK" ? (
                  <Link2 className="h-4 w-4 shrink-0 text-blue-600" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                )}
                <div className="min-w-0 flex-1">
                  {doc.type === "FILE" ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDoc({ title: doc.title, url: doc.url })
                      }
                      className="flex items-center gap-1 truncate text-sm font-medium text-slate-900 hover:text-blue-700"
                    >
                      {doc.title}
                    </button>
                  ) : (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 truncate text-sm font-medium text-slate-900 hover:text-blue-700"
                    >
                      {doc.title}
                      <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                    </a>
                  )}
                  <p className="text-xs text-slate-500">
                    {doc.uploadedBy ?? "-"} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc)}
                    disabled={pending}
                    aria-label={`Hapus ${doc.title}`}
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <DocumentPreviewDialog doc={previewDoc} onOpenChange={() => setPreviewDoc(null)} />
    </Card>
  );
}
