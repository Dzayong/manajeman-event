"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bot, Copy, Loader2, Save, Send, User } from "lucide-react";
import type { ReportType } from "@prisma/client";
import { reviseReportViaChat, updateReport } from "@/server/actions/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = { role: "user" | "assistant"; text: string };

const EXAMPLE_PROMPTS = [
  "Perpendek bagian evaluasi",
  "Tambahkan poin risiko dana belum cair",
  "Ubah jadi bahasa yang lebih formal",
];

export function ReportWorkspace({
  reportId,
  type,
  initialContent,
  editable,
}: {
  reportId: number;
  type: ReportType;
  initialContent: string;
  editable: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [savePending, startSave] = useTransition();
  const [chatPending, startChat] = useTransition();
  const [instruction, setInstruction] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text:
        type === "LPJ_DRAFT"
          ? "Ini draft LPJ awal dari AI. Minta aku merevisi bagian tertentu, atau edit langsung di sebelah kiri."
          : "Ini ringkasan progress awal dari AI. Minta aku merevisi bagian tertentu, atau edit langsung di sebelah kiri.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, chatPending]);

  function handleSave() {
    startSave(async () => {
      const result = await updateReport(reportId, content);
      if (result.error) toast.error(result.error);
      else toast.success("Laporan disimpan");
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    toast.success("Isi laporan disalin ke clipboard");
  }

  function sendInstruction(text: string) {
    const trimmed = text.trim();
    if (!trimmed || chatPending) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInstruction("");
    startChat(async () => {
      const result = await reviseReportViaChat(reportId, trimmed);
      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Gagal merevisi: ${result.error}` },
        ]);
        toast.error(result.error);
        return;
      }
      setContent(result.content ?? content);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.reply ?? "Sudah kurevisi." },
      ]);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draft laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            readOnly={!editable}
            className="font-sans text-sm leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="mr-1 h-4 w-4" />
              Salin
            </Button>
            {editable && (
              <Button onClick={handleSave} disabled={savePending}>
                {savePending ? (
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

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            Ngobrol dengan AI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div
            ref={scrollRef}
            className="flex max-h-[420px] min-h-[300px] flex-1 flex-col gap-3 overflow-y-auto pr-1"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    m.role === "user"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </span>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-red-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {chatPending && (
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Bot className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Merevisi…
                </div>
              </div>
            )}
          </div>

          {messages.length === 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => sendInstruction(p)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {editable && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendInstruction(instruction);
              }}
              className="mt-3 flex items-end gap-2 border-t pt-3"
            >
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendInstruction(instruction);
                  }
                }}
                placeholder="Minta AI merevisi sesuatu…"
                rows={2}
                className="flex-1 resize-none text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={chatPending || !instruction.trim()}
                aria-label="Kirim instruksi"
              >
                {chatPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
