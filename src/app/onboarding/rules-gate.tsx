"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { acknowledgeRules } from "@/server/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export function RulesGate({
  eventId,
  rulesContent,
}: {
  eventId: number;
  rulesContent: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAcknowledge() {
    startTransition(async () => {
      await acknowledgeRules(eventId);
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border bg-slate-50 p-4 text-sm text-slate-700">
          {rulesContent}
        </div>
        <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
          <Checkbox
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-0.5"
          />
          Saya sudah membaca dan menyetujui tata tertib kepanitiaan ini.
        </label>
        <Button
          onClick={handleAcknowledge}
          disabled={!agreed || pending}
          className="mt-4 w-full"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan…
            </>
          ) : (
            "Setujui dan lanjut"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
