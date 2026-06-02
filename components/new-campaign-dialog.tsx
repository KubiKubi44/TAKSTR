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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Přednastavené typy podniků → OSM tagy. Uživatel nemusí znát OSM.
const PRESETS: Record<
  string,
  { label: string; vertical: string; tagKey: string; tagValue: string }
> = {
  restaurant: { label: "Restaurace", vertical: "restaurace", tagKey: "amenity", tagValue: "restaurant" },
  cafe: { label: "Kavárna", vertical: "kavárna", tagKey: "amenity", tagValue: "cafe" },
  hairdresser: { label: "Kadeřnictví", vertical: "kadeřnictví", tagKey: "shop", tagValue: "hairdresser" },
  beauty: { label: "Kosmetika", vertical: "kosmetika", tagKey: "shop", tagValue: "beauty" },
  guest_house: { label: "Penzion / ubytování", vertical: "ubytování", tagKey: "tourism", tagValue: "guest_house" },
  hotel: { label: "Hotel", vertical: "hotel", tagKey: "tourism", tagValue: "hotel" },
  car_repair: { label: "Autoservis", vertical: "autoservis", tagKey: "shop", tagValue: "car_repair" },
  fitness: { label: "Fitness / posilovna", vertical: "fitness", tagKey: "leisure", tagValue: "fitness_centre" },
  dentist: { label: "Zubař", vertical: "zubař", tagKey: "healthcare", tagValue: "dentist" },
  florist: { label: "Květinářství", vertical: "květinářství", tagKey: "shop", tagValue: "florist" },
  motocross: { label: "Motokros (areál)", vertical: "motokros", tagKey: "sport", tagValue: "motocross" },
};

const CUSTOM = "custom";

export function NewCampaignDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    vertical: "",
    region: "",
    tagKey: "",
    tagValue: "",
    limit: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function choosePreset(value: string) {
    setPreset(value);
    if (value !== CUSTOM && PRESETS[value]) {
      const p = PRESETS[value];
      setForm((f) => ({
        ...f,
        vertical: p.vertical,
        tagKey: p.tagKey,
        tagValue: p.tagValue,
        name: f.name || `${p.label}${f.region ? ` ${f.region}` : ""}`,
      }));
    } else {
      setForm((f) => ({ ...f, vertical: "", tagKey: "", tagValue: "" }));
    }
  }

  const isCustom = preset === CUSTOM;
  const canSubmit =
    form.name.trim() && form.region.trim() && form.tagKey.trim() && !loading;

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          vertical: (form.vertical || preset || "podnik").trim(),
          region: form.region.trim(),
          tagKey: form.tagKey.trim(),
          tagValue: form.tagValue.trim() || undefined,
          areaName: form.region.trim(), // region = OSM oblast
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
            Vyber typ podniku a region — discovery pak natáhne firmy
            z OpenStreetMap. OSM tagy nemusíš znát.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Typ podniku</Label>
            <Select value={preset} onValueChange={(v) => choosePreset(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Vyber typ…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRESETS).map(([key, p]) => (
                  <SelectItem key={key} value={key}>
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM}>Vlastní (zadat OSM tag)…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCustom && (
            <div className="grid grid-cols-2 gap-3 border-l-2 border-primary/40 pl-3">
              <div className="grid gap-1.5">
                <Label htmlFor="c-tagkey">OSM tag klíč</Label>
                <Input id="c-tagkey" value={form.tagKey} onChange={set("tagKey")} placeholder="amenity" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-tagval">Hodnota</Label>
                <Input id="c-tagval" value={form.tagValue} onChange={set("tagValue")} placeholder="restaurant" />
              </div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="c-region">Region / oblast</Label>
            <Input
              id="c-region"
              value={form.region}
              onChange={set("region")}
              placeholder="Jihlava / Kraj Vysočina / Brno"
            />
            <p className="text-xs text-muted-foreground">
              Použije se i jako oblast hledání v OSM (město nebo kraj).
            </p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="c-name">Název kampaně</Label>
              <Input id="c-name" value={form.name} onChange={set("name")} placeholder="Restaurace Jihlava" />
            </div>
            <div className="grid w-24 gap-1.5">
              <Label htmlFor="c-limit">Limit</Label>
              <Input id="c-limit" value={form.limit} onChange={set("limit")} placeholder="200" inputMode="numeric" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Zrušit
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {loading ? "Zakládám…" : "Založit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
