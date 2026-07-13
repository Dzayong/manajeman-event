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
  addLinkDocument,
  deleteDocument,
  uploadFileDocument,
} from "@/server/actions/documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DocumentPreviewDialog,
  type PreviewableDoc,
} from "@/components/document-preview-dialog";
import { getEmbedUrl } from "@/lib/embed-url";

type DocumentRow = {
  id: number;
  title: string;
  type: "FILE" | "LINK";
  url: string;
  uploadedBy: string | null;
  createdAt: string;
};

export function DocumentsPanel({
  divisionId,
  documents,
  canEdit,
}: {
  divisionId: number;
  documents: DocumentRow[];
  canEdit: boolean;
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
      const result = await addLinkDocument(divisionId, {
        title: linkTitle,
        url: linkUrl,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Link ditambahkan");
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
      const result = await uploadFileDocument(divisionId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${file.name} terupload`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDelete(doc: DocumentRow) {
    startTransition(async () => {
      const result = await deleteDocument(doc.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Dokumen dihapus");
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <form
              onSubmit={handleAddLink}
              className="flex flex-wrap items-center gap-2"
            >
              <Input
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Judul (mis. Rundown acara)"
                className="w-52"
                aria-label="Judul link"
              />
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://docs.google.com/…"
                className="min-w-64 flex-1"
                aria-label="URL"
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
          </CardContent>
        </Card>
      )}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FolderOpen className="h-10 w-10 text-slate-300" />
            <p className="mt-4 font-medium text-slate-900">
              Belum ada dokumen
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Tempel link Google Docs/Canva/Figma atau upload file agar semua
              anggota divisi menemukannya di satu tempat.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="py-0">
              <CardContent className="flex items-center gap-3 p-3">
                {doc.type === "LINK" ? (
                  <Link2 className="h-5 w-5 shrink-0 text-blue-600" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-slate-500" />
                )}
                <div className="min-w-0 flex-1">
                  {doc.type === "FILE" || getEmbedUrl(doc.url) ? (
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
                {canEdit && (
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DocumentPreviewDialog doc={previewDoc} onOpenChange={() => setPreviewDoc(null)} />
    </div>
  );
}
