"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    buildPrice: "",
    monthlyPrice: "",
    note: "",
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Vyplň název.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          url: form.url.trim() || undefined,
          buildPrice: form.buildPrice || undefined,
          monthlyPrice: form.monthlyPrice || undefined,
          note: form.note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Chyba ${res.status}`);
        return;
      }
      toast.success("Projekt přidán");
      setOpen(false);
      router.push(`/projekty/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        + Přidat ručně
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Přidat projekt ručně</DialogTitle>
          <DialogDescription>
            Projekt mimo Vercel (jiný hosting, klient bez deploye…).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="p-name">Název</Label>
            <Input id="p-name" value={form.name} onChange={set("name")} placeholder="Web klienta" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-url">Web (volitelně)</Label>
            <Input id="p-url" value={form.url} onChange={set("url")} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-build">Výrobní cena (Kč)</Label>
              <Input id="p-build" inputMode="numeric" value={form.buildPrice} onChange={set("buildPrice")} placeholder="25000" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-monthly">Měsíčně (Kč)</Label>
              <Input id="p-monthly" inputMode="numeric" value={form.monthlyPrice} onChange={set("monthlyPrice")} placeholder="1500" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-note">Poznámka (volitelně)</Label>
            <Textarea id="p-note" value={form.note} onChange={set("note")} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Zrušit
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Přidávám…" : "Přidat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
