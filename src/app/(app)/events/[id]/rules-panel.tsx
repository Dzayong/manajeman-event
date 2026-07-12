"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateRules } from "@/server/actions/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export function RulesPanel({
  eventId,
  rulesContent,
  rulesVersion,
  ackCount,
  memberCount,
}: {
  eventId: number;
  rulesContent: string;
  rulesVersion: number;
  ackCount: number;
  memberCount: number;
}) {
  const [content, setContent] = useState(rulesContent);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateRules(eventId, content);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        "Aturan disimpan — semua panitia diminta menyetujui ulang saat login",
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Tata tertib panitia</CardTitle>
          {rulesContent && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Badge variant="secondary">v{rulesVersion}</Badge>
              {ackCount}/{memberCount} panitia sudah menyetujui
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500">
          Aturan ini ditampilkan ke setiap panitia saat login pertama dan harus
          disetujui sebelum masuk workspace. Mengubah aturan meminta semua
          panitia menyetujui ulang.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder={
            "Contoh:\n1. Hadir maksimal 10 menit sebelum rapat dimulai.\n2. Izin tidak hadir disampaikan ke koordinator divisi H-1.\n3. Update progress tugas minimal setiap 2 hari."
          }
        />
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={pending || !content.trim()}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan…
              </>
            ) : (
              "Simpan aturan"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
