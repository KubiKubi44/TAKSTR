"use client";

import { useMemo, useState } from "react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Preset {
  key: string;
  label: string;
  vertical: string;
  tagKey: string;
  tagValue: string;
}

// Přednastavené typy podniků → OSM tagy. Uživatel nemusí znát OSM.
const PRESET_GROUPS: { group: string; items: Preset[] }[] = [
  {
    group: "Gastronomie",
    items: [
      { key: "restaurant", label: "Restaurace", vertical: "restaurace", tagKey: "amenity", tagValue: "restaurant" },
      { key: "cafe", label: "Kavárna", vertical: "kavárna", tagKey: "amenity", tagValue: "cafe" },
      { key: "fast_food", label: "Rychlé občerstvení", vertical: "občerstvení", tagKey: "amenity", tagValue: "fast_food" },
      { key: "bar", label: "Bar", vertical: "bar", tagKey: "amenity", tagValue: "bar" },
      { key: "pub", label: "Hospoda", vertical: "hospoda", tagKey: "amenity", tagValue: "pub" },
      { key: "ice_cream", label: "Zmrzlina", vertical: "zmrzlina", tagKey: "amenity", tagValue: "ice_cream" },
      { key: "bakery", label: "Pekařství", vertical: "pekařství", tagKey: "shop", tagValue: "bakery" },
      { key: "confectionery", label: "Cukrárna", vertical: "cukrárna", tagKey: "shop", tagValue: "confectionery" },
      { key: "butcher", label: "Řeznictví", vertical: "řeznictví", tagKey: "shop", tagValue: "butcher" },
      { key: "wine", label: "Vinotéka", vertical: "vinotéka", tagKey: "shop", tagValue: "wine" },
    ],
  },
  {
    group: "Ubytování",
    items: [
      { key: "hotel", label: "Hotel", vertical: "hotel", tagKey: "tourism", tagValue: "hotel" },
      { key: "guest_house", label: "Penzion", vertical: "penzion", tagKey: "tourism", tagValue: "guest_house" },
      { key: "hostel", label: "Hostel", vertical: "hostel", tagKey: "tourism", tagValue: "hostel" },
      { key: "apartment", label: "Apartmán", vertical: "apartmán", tagKey: "tourism", tagValue: "apartment" },
      { key: "chalet", label: "Chata / chalupa", vertical: "chata", tagKey: "tourism", tagValue: "chalet" },
      { key: "camp_site", label: "Kemp", vertical: "kemp", tagKey: "tourism", tagValue: "camp_site" },
    ],
  },
  {
    group: "Krása & zdraví",
    items: [
      { key: "hairdresser", label: "Kadeřnictví", vertical: "kadeřnictví", tagKey: "shop", tagValue: "hairdresser" },
      { key: "beauty", label: "Kosmetika", vertical: "kosmetika", tagKey: "shop", tagValue: "beauty" },
      { key: "massage", label: "Masáže", vertical: "masáže", tagKey: "shop", tagValue: "massage" },
      { key: "tattoo", label: "Tetování", vertical: "tetování", tagKey: "shop", tagValue: "tattoo" },
      { key: "optician", label: "Optika", vertical: "optika", tagKey: "shop", tagValue: "optician" },
      { key: "pharmacy", label: "Lékárna", vertical: "lékárna", tagKey: "amenity", tagValue: "pharmacy" },
      { key: "dentist", label: "Zubař", vertical: "zubař", tagKey: "amenity", tagValue: "dentist" },
      { key: "doctors", label: "Lékař / ordinace", vertical: "ordinace", tagKey: "amenity", tagValue: "doctors" },
      { key: "veterinary", label: "Veterinář", vertical: "veterinář", tagKey: "amenity", tagValue: "veterinary" },
    ],
  },
  {
    group: "Auto & moto",
    items: [
      { key: "car_repair", label: "Autoservis", vertical: "autoservis", tagKey: "shop", tagValue: "car_repair" },
      { key: "car", label: "Autobazar / prodejce", vertical: "autobazar", tagKey: "shop", tagValue: "car" },
      { key: "car_parts", label: "Autodíly", vertical: "autodíly", tagKey: "shop", tagValue: "car_parts" },
      { key: "tyres", label: "Pneuservis", vertical: "pneuservis", tagKey: "shop", tagValue: "tyres" },
      { key: "car_wash", label: "Myčka aut", vertical: "myčka", tagKey: "amenity", tagValue: "car_wash" },
      { key: "motorcycle", label: "Moto prodejna", vertical: "moto", tagKey: "shop", tagValue: "motorcycle" },
      { key: "driving_school", label: "Autoškola", vertical: "autoškola", tagKey: "amenity", tagValue: "driving_school" },
    ],
  },
  {
    group: "Sport & volný čas",
    items: [
      { key: "fitness", label: "Fitness / posilovna", vertical: "fitness", tagKey: "leisure", tagValue: "fitness_centre" },
      { key: "sports_centre", label: "Sportovní centrum", vertical: "sport", tagKey: "leisure", tagValue: "sports_centre" },
      { key: "swimming_pool", label: "Bazén", vertical: "bazén", tagKey: "leisure", tagValue: "swimming_pool" },
      { key: "golf", label: "Golf", vertical: "golf", tagKey: "leisure", tagValue: "golf_course" },
      { key: "dance", label: "Taneční / studio", vertical: "tanec", tagKey: "leisure", tagValue: "dance" },
      { key: "horse_riding", label: "Jezdectví", vertical: "jezdectví", tagKey: "leisure", tagValue: "horse_riding" },
      { key: "motocross", label: "Motokros (areál)", vertical: "motokros", tagKey: "sport", tagValue: "motocross" },
    ],
  },
  {
    group: "Obchody",
    items: [
      { key: "florist", label: "Květinářství", vertical: "květinářství", tagKey: "shop", tagValue: "florist" },
      { key: "greengrocer", label: "Ovoce a zelenina", vertical: "ovoce-zelenina", tagKey: "shop", tagValue: "greengrocer" },
      { key: "clothes", label: "Oděvy", vertical: "oděvy", tagKey: "shop", tagValue: "clothes" },
      { key: "shoes", label: "Obuv", vertical: "obuv", tagKey: "shop", tagValue: "shoes" },
      { key: "jewelry", label: "Klenoty", vertical: "klenoty", tagKey: "shop", tagValue: "jewelry" },
      { key: "furniture", label: "Nábytek", vertical: "nábytek", tagKey: "shop", tagValue: "furniture" },
      { key: "hardware", label: "Železářství", vertical: "železářství", tagKey: "shop", tagValue: "hardware" },
      { key: "doityourself", label: "Hobby market", vertical: "hobby", tagKey: "shop", tagValue: "doityourself" },
      { key: "bicycle", label: "Cyklo prodejna", vertical: "cyklo", tagKey: "shop", tagValue: "bicycle" },
      { key: "books", label: "Knihkupectví", vertical: "knihkupectví", tagKey: "shop", tagValue: "books" },
      { key: "toys", label: "Hračky", vertical: "hračky", tagKey: "shop", tagValue: "toys" },
      { key: "pet", label: "Chovatelské potřeby", vertical: "chovatelské", tagKey: "shop", tagValue: "pet" },
      { key: "electronics", label: "Elektro", vertical: "elektro", tagKey: "shop", tagValue: "electronics" },
      { key: "computer", label: "Počítače", vertical: "počítače", tagKey: "shop", tagValue: "computer" },
      { key: "mobile_phone", label: "Mobily", vertical: "mobily", tagKey: "shop", tagValue: "mobile_phone" },
      { key: "garden_centre", label: "Zahradnictví", vertical: "zahradnictví", tagKey: "shop", tagValue: "garden_centre" },
      { key: "gift", label: "Dárky", vertical: "dárky", tagKey: "shop", tagValue: "gift" },
    ],
  },
  {
    group: "Služby & řemesla",
    items: [
      { key: "travel_agency", label: "Cestovní kancelář", vertical: "cestovka", tagKey: "shop", tagValue: "travel_agency" },
      { key: "estate_agent", label: "Reality", vertical: "reality", tagKey: "office", tagValue: "estate_agent" },
      { key: "photographer", label: "Fotograf", vertical: "fotograf", tagKey: "craft", tagValue: "photographer" },
      { key: "laundry", label: "Prádelna", vertical: "prádelna", tagKey: "shop", tagValue: "laundry" },
      { key: "dry_cleaning", label: "Čistírna", vertical: "čistírna", tagKey: "shop", tagValue: "dry_cleaning" },
      { key: "funeral", label: "Pohřební služba", vertical: "pohřební", tagKey: "shop", tagValue: "funeral_directors" },
      { key: "locksmith", label: "Zámečník", vertical: "zámečník", tagKey: "craft", tagValue: "locksmith" },
      { key: "electrician", label: "Elektrikář", vertical: "elektrikář", tagKey: "craft", tagValue: "electrician" },
      { key: "plumber", label: "Instalatér", vertical: "instalatér", tagKey: "craft", tagValue: "plumber" },
      { key: "carpenter", label: "Truhlář", vertical: "truhlář", tagKey: "craft", tagValue: "carpenter" },
      { key: "brewery", label: "Pivovar", vertical: "pivovar", tagKey: "craft", tagValue: "brewery" },
      { key: "winery", label: "Vinařství", vertical: "vinařství", tagKey: "craft", tagValue: "winery" },
    ],
  },
  {
    group: "Vzdělání & kultura",
    items: [
      { key: "kindergarten", label: "Školka", vertical: "školka", tagKey: "amenity", tagValue: "kindergarten" },
      { key: "language_school", label: "Jazyková škola", vertical: "jazyková škola", tagKey: "amenity", tagValue: "language_school" },
      { key: "music_school", label: "Hudební škola / ZUŠ", vertical: "hudební škola", tagKey: "amenity", tagValue: "music_school" },
      { key: "cinema", label: "Kino", vertical: "kino", tagKey: "amenity", tagValue: "cinema" },
      { key: "theatre", label: "Divadlo", vertical: "divadlo", tagKey: "amenity", tagValue: "theatre" },
      { key: "gallery", label: "Galerie", vertical: "galerie", tagKey: "tourism", tagValue: "gallery" },
    ],
  },
];

const PRESETS: Record<string, Preset> = Object.fromEntries(
  PRESET_GROUPS.flatMap((g) => g.items).map((p) => [p.key, p]),
);

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
    !!form.name.trim() && !!form.region.trim() && !!form.tagKey.trim() && !loading;

  const presetLabel = useMemo(
    () => (isCustom ? "Vlastní" : PRESETS[preset]?.label),
    [preset, isCustom],
  );

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
          areaName: form.region.trim(),
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
            Vyber typ podniku a region — discovery natáhne firmy z OpenStreetMap.
            OSM tagy nemusíš znát.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Typ podniku</Label>
            <Select value={preset} onValueChange={(v) => choosePreset(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Vyber typ…">{presetLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {PRESET_GROUPS.map((g) => (
                  <SelectGroup key={g.group}>
                    <SelectLabel>{g.group}</SelectLabel>
                    {g.items.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectLabel>Pokročilé</SelectLabel>
                  <SelectItem value={CUSTOM}>Vlastní (zadat OSM tag)…</SelectItem>
                </SelectGroup>
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
