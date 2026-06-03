"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export function NewExpenseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recurring, setRecurring] = useState(true);
  const [form, setForm] = useState({ name: "", category: "", amount: "", note: "" });

  const set =
    (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.name.trim() || !form.amount.trim()) {
      toast.error("Vyplň název a částku.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category.trim() || undefined,
          amount: form.amount,
          recurring,
          note: form.note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Chyba ${res.status}`);
        return;
      }
      toast.success("Výdaj přidán");
      setOpen(false);
      setForm({ name: "", category: "", amount: "", note: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Přidat výdaj</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nový výdaj</DialogTitle>
          <DialogDescription>Náklad studia (hosting, doména, nástroj, subdodávka…).</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="e-name">Název</Label>
              <Input id="e-name" value={form.name} onChange={set("name")} placeholder="Vercel Pro" />
            </div>
            <div className="grid w-28 gap-1.5">
              <Label htmlFor="e-amount">Částka (Kč)</Label>
              <Input id="e-amount" inputMode="numeric" value={form.amount} onChange={set("amount")} placeholder="500" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="e-cat">Kategorie (volitelně)</Label>
            <Input id="e-cat" value={form.category} onChange={set("category")} placeholder="hosting / doména / nástroj" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={recurring} onCheckedChange={(v) => setRecurring(v === true)} />
            Měsíčně se opakuje
          </label>
          <div className="grid gap-1.5">
            <Label htmlFor="e-note">Poznámka (volitelně)</Label>
            <Input id="e-note" value={form.note} onChange={set("note")} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Zrušit</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Přidávám…" : "Přidat"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
