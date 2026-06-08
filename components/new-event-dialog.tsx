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

interface LeadOption {
  id: string;
  businessName: string;
}

const NONE = "none";

export function NewEventDialog({
  leads,
  presetLeadId,
  presetLeadName,
  trigger,
}: {
  leads?: LeadOption[];
  presetLeadId?: string;
  presetLeadName?: string;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState("meeting");
  const [leadId, setLeadId] = useState(presetLeadId ?? NONE);
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
              : "Schůzka nebo follow-up, volitelně navázaná na lead."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Typ</Label>
              <Select
                items={{ meeting: "Schůzka", followup: "Follow-up" }}
                value={kind}
                onValueChange={(v) => setKind(v ?? "meeting")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Schůzka</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!presetLeadId && leads && (
              <div className="grid gap-1.5">
                <Label>Lead</Label>
                <Select
                  items={{ [NONE]: "Bez leadu", ...Object.fromEntries(leads.map((l) => [l.id, l.businessName])) }}
                  value={leadId}
                  onValueChange={(v) => setLeadId(v ?? NONE)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Bez leadu" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value={NONE}>Bez leadu</SelectItem>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev-title">Název</Label>
            <Input
              id="ev-title"
              value={form.title}
              onChange={set("title")}
              placeholder={kind === "meeting" ? "Schůzka — …" : "Ozvat se …"}
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
