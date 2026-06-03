"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClientForm({
  projectId,
  showUrl = false,
  initial,
}: {
  projectId: string;
  showUrl?: boolean;
  initial: {
    clientName: string | null;
    clientEmail: string | null;
    clientPhone: string | null;
    url: string | null;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientName: initial.clientName ?? "",
    clientEmail: initial.clientEmail ?? "",
    clientPhone: initial.clientPhone ?? "",
    url: initial.url ?? "",
  });

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone,
      };
      if (showUrl) payload.url = form.url;
      const res = await fetch(`/api/projects/${projectId}/meta`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Uložení selhalo");
        return;
      }
      toast.success("Uloženo");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {showUrl && (
        <div className="grid gap-1.5">
          <Label htmlFor="c-url">Web</Label>
          <Input id="c-url" value={form.url} onChange={set("url")} placeholder="https://…" />
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="c-name">Jméno klienta</Label>
        <Input id="c-name" value={form.clientName} onChange={set("clientName")} placeholder="Jan Novák" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="c-email">E-mail</Label>
          <Input id="c-email" value={form.clientEmail} onChange={set("clientEmail")} placeholder="jan@…" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-phone">Telefon</Label>
          <Input id="c-phone" value={form.clientPhone} onChange={set("clientPhone")} placeholder="+420…" />
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={save} disabled={loading}>
        {loading ? "Ukládám…" : "Uložit kontakt"}
      </Button>
    </div>
  );
}
