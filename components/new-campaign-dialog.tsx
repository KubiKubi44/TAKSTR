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

export function NewCampaignDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    vertical: "",
    region: "",
    tagKey: "",
    tagValue: "",
    areaName: "",
    limit: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          vertical: form.vertical,
          region: form.region,
          tagKey: form.tagKey,
          tagValue: form.tagValue || undefined,
          areaName: form.areaName,
          limit: form.limit ? Number(form.limit) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Chyba ${res.status}`);
        return;
      }
      toast.success("Kampaň založena");
      setOpen(false);
      router.push(`/kampane/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>+ Nová kampaň</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nová kampaň</DialogTitle>
          <DialogDescription>
            Jeden vertikál / běh. Discovery jede přes OpenStreetMap — vyber OSM
            tag a oblast.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Název</Label>
            <Input id="c-name" value={form.name} onChange={set("name")} placeholder="Motokros Vysočina" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="c-vertical">Vertikál</Label>
              <Input id="c-vertical" value={form.vertical} onChange={set("vertical")} placeholder="motokros" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-region">Region</Label>
              <Input id="c-region" value={form.region} onChange={set("region")} placeholder="Kraj Vysočina" />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              OSM filtr
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="c-tagkey">Tag klíč</Label>
                <Input id="c-tagkey" value={form.tagKey} onChange={set("tagKey")} placeholder="sport" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-tagval">Tag hodnota</Label>
                <Input id="c-tagval" value={form.tagValue} onChange={set("tagValue")} placeholder="motocross" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="c-area">Oblast (OSM)</Label>
                <Input id="c-area" value={form.areaName} onChange={set("areaName")} placeholder="Kraj Vysočina" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-limit">Limit</Label>
                <Input id="c-limit" value={form.limit} onChange={set("limit")} placeholder="200" inputMode="numeric" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Zrušit
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Zakládám…" : "Založit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
