"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const NONE = "none";

export interface EditableEvent {
  id: string;
  kind: "meeting" | "followup";
  title: string;
  startAt: string | Date;
  endAt: string | Date | null;
  allDay: boolean;
  location: string | null;
  note: string | null;
  leadId: string | null;
  done: boolean;
}

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function EventForm({
  event,
  presetStart,
  leads,
  onClose,
}: {
  event: EditableEvent | null;
  presetStart: Date | null;
  leads: { id: string; businessName: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<string>(event?.kind ?? "meeting");
  const [title, setTitle] = useState(event?.title ?? "");
  const [start, setStart] = useState(
    event ? toLocalInput(new Date(event.startAt)) : presetStart ? toLocalInput(presetStart) : "",
  );
  const [end, setEnd] = useState(event?.endAt ? toLocalInput(new Date(event.endAt)) : "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [note, setNote] = useState(event?.note ?? "");
  const [leadId, setLeadId] = useState(event?.leadId ?? NONE);

  async function save() {
    if (!title.trim() || !start) {
      toast.error("Vyplň název a začátek.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        kind,
        startAt: new Date(start).toISOString(),
        endAt: end ? new Date(end).toISOString() : null,
        location: location.trim() || null,
        note: note.trim() || null,
        leadId: leadId !== NONE ? leadId : null,
      };
      const url = event ? `/api/calendar/${event.id}` : "/api/calendar";
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Nepovedlo se");
        return;
      }
      toast.success(event ? "Uloženo" : "Událost přidána");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!event || !window.confirm("Smazat událost?")) return;
    const res = await fetch(`/api/calendar/${event.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Smazáno");
      onClose();
      router.refresh();
    } else toast.error("Nepovedlo se");
  }

  async function toggleDone() {
    if (!event) return;
    await fetch(`/api/calendar/${event.id}/done`, { method: "POST" });
    onClose();
    router.refresh();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{event ? "Upravit událost" : "Nová událost"}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Typ</Label>
            <Select value={kind} onValueChange={(v) => setKind(v ?? "meeting")}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Schůzka</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {leads.length > 0 && (
            <div className="grid gap-1.5">
              <Label>Lead</Label>
              <Select value={leadId} onValueChange={(v) => setLeadId(v ?? NONE)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Bez leadu" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value={NONE}>Bez leadu</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.businessName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ev-title">Název</Label>
          <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ev-start">Začátek</Label>
            <Input id="ev-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ev-end">Konec</Label>
            <Input id="ev-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ev-loc">Místo</Label>
          <Input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Adresa / online" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ev-note">Poznámka</Label>
          <Textarea id="ev-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
      </div>

      <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          {event && (
            <>
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={remove}>Smazat</Button>
              <Button variant="outline" onClick={toggleDone}>{event.done ? "Vrátit" : "Hotovo"}</Button>
            </>
          )}
        </div>
        <Button onClick={save} disabled={loading}>
          {loading ? "Ukládám…" : event ? "Uložit" : "Přidat"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  presetStart,
  leads,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event: EditableEvent | null;
  presetStart: Date | null;
  leads: { id: string; businessName: string }[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <EventForm
            key={event ? event.id : `new-${presetStart?.getTime() ?? 0}`}
            event={event}
            presetStart={presetStart}
            leads={leads}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
