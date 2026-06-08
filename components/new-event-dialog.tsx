"use client";

import { useState, type ChangeEvent, type ReactElement, type ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "@/components/ui/color-picker";
import { EVENT_KINDS, EVENT_KIND_LABEL } from "@/lib/eventMeta";

const NONE = "none";

export function NewEventDialog({
  presetLeadId,
  presetLeadName,
  trigger,
}: {
  presetLeadId?: string;
  presetLeadName?: string;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState("meeting");
  const [color, setColor] = useState("");
  const [leadId] = useState(presetLeadId ?? NONE);
  const [form, setForm] = useState({
    title: "",
    startAt: "",
    endAt: "",
    location: "",
    note: "",
  });

  const set =
    (k: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.title.trim() || !form.startAt) {
      toast.error("Vyplň název a začátek.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          kind,
          color: color || undefined,
          startAt: new Date(form.startAt).toISOString(),
          endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
          location: form.location.trim() || undefined,
          note: form.note.trim() || undefined,
          leadId: leadId !== NONE ? leadId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Chyba ${res.status}`);
        return;
      }
      toast.success("Událost přidána");
      setOpen(false);
      setForm({ title: "", startAt: "", endAt: "", location: "", note: "" });
      setColor("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={(trigger as ReactElement) ?? <Button size="sm" />}>
        {trigger ? undefined : "+ Nová událost"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nová událost</DialogTitle>
          <DialogDescription>
            {presetLeadName
              ? `Navázáno na lead: ${presetLeadName}`
              : "Schůzka, follow-up, fakturace nebo vlastní událost."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Typ</Label>
            <Select
              items={EVENT_KIND_LABEL}
              value={kind}
              onValueChange={(v) => setKind(v ?? "meeting")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {EVENT_KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Barva</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev-title">Název</Label>
            <Input
              id="ev-title"
              value={form.title}
              onChange={set("title")}
              placeholder={kind === "meeting" ? "Schůzka — …" : "Název události…"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-start">Začátek</Label>
              <Input id="ev-start" type="datetime-local" value={form.startAt} onChange={set("startAt")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-end">Konec (volitelně)</Label>
              <Input id="ev-end" type="datetime-local" value={form.endAt} onChange={set("endAt")} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev-loc">Místo (volitelně)</Label>
            <Input id="ev-loc" value={form.location} onChange={set("location")} placeholder="Adresa / online" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ev-note">Poznámka (volitelně)</Label>
            <Textarea id="ev-note" value={form.note} onChange={set("note")} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Zrušit
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Ukládám…" : "Přidat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
