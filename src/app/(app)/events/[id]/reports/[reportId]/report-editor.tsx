"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Save } from "lucide-react";
import { updateReport } from "@/server/actions/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function ReportEditor({
  reportId,
  content,
  editable,
}: {
  reportId: number;
  content: string;
  editable: boolean;
}) {
  const [text, setText] = useState(content);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateReport(reportId, text);
      if (result.error) toast.error(result.error);
      else toast.success("Laporan disimpan");
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    toast.success("Isi laporan disalin ke clipboard");
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          readOnly={!editable}
          className="font-sans text-sm leading-relaxed"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="mr-1 h-4 w-4" />
            Salin
          </Button>
          {editable && (
            <Button onClick={handleSave} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan…
                </>
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" />
                  Simpan
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
