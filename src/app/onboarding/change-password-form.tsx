"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  changePassword,
  type ChangePasswordState,
} from "@/server/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<
    ChangePasswordState,
    FormData
  >(changePassword, {});

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Password sementara</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password baru</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="text-xs text-slate-500">Minimal 8 karakter.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Ulangi password baru</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-red-600">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan…
              </>
            ) : (
              "Simpan password baru"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
