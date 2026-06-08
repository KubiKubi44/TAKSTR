"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { LeadStatus } from "@/db/schema";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "@/lib/leadStatus";
import { ScoreBadge } from "@/components/score-badge";
import { OpportunityBadge } from "@/components/opportunity-badge";
import { StatusBadge } from "@/components/status-badge";
import { LeadFlags } from "@/components/lead-flags";
import { computeOpportunity, type OpportunityScore } from "@/lib/opportunity";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export interface WorkspaceLead {
  id: string;
  businessName: string;
  websiteUrl: string;
  score: number | null;
  status: LeadStatus;
  flags: Record<string, unknown>;
  enrichment?: Record<string, unknown> | null;
  contactEmail?: string | null;
  phone?: string | null;
  campaign?: { name: string } | null;
}

function oppOf(l: WorkspaceLead): OpportunityScore {
  return computeOpportunity({
    score: l.score,
    flags: l.flags ?? {},
    enrichment: l.enrichment ?? {},
    contactEmail: l.contactEmail ?? null,
    phone: l.phone ?? null,
  });
}

export function LeadsWorkspace({
  leads,
  showCampaign = false,
}: {
  leads: WorkspaceLead[];
  showCampaign?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState("table");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("opp");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const base =
      statusFilter === "all" ? leads : leads.filter((l) => l.status === statusFilter);
    if (sortBy === "score") {
      return [...base].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    }
    // default: podle příležitosti (zlatý lead nahoře)
    return [...base].sort((a, b) => oppOf(b).score - oppOf(a).score);
  }, [leads, statusFilter, sortBy]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allVisibleSelected) filtered.forEach((l) => next.delete(l.id));
      else filtered.forEach((l) => next.add(l.id));
      return next;
    });

  async function runBulk(kind: "analyze" | "draft") {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    const path = kind === "analyze" ? "analyze" : "draft";
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/leads/${id}/${path}`, { method: "POST" });
        if (res.ok) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    setBusy(false);
    setSelected(new Set());
    toast[fail === 0 ? "success" : "warning"](
      `${kind === "analyze" ? "Analýza" : "Drafty"}: ${ok} OK${fail ? `, ${fail} chyb` : ""}`,
    );
    router.refresh();
  }

  async function moveTo(id: string, status: LeadStatus) {
    try {
      const res = await fetch(`/api/leads/${id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Změna stavu selhala");
        return;
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="table">Tabulka</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === "table" && (
          <>
            <Select
              items={{
                all: "Všechny stavy",
                ...Object.fromEntries(LEAD_STATUS_ORDER.map((s) => [s, LEAD_STATUS_LABEL[s]])),
              }}
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v ?? "all")}
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder="Stav" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                {LEAD_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={{ opp: "Podle příležitosti", score: "Podle skóre webu" }}
              value={sortBy}
              onValueChange={(v) => setSortBy(v ?? "opp")}
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder="Řadit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opp">Podle příležitosti</SelectItem>
                <SelectItem value="score">Podle skóre webu</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        <span className="font-mono text-xs text-muted-foreground">
          {filtered.length} leadů
        </span>

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {selected.size} vybráno
            </span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => runBulk("analyze")}>
              Analyzovat vybrané
            </Button>
            <Button size="sm" disabled={busy} onClick={() => runBulk("draft")}>
              Generovat draft
            </Button>
          </div>
        )}
      </div>

      {view === "table" ? (
        <div className="glass overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Vybrat vše"
                  />
                </TableHead>
                <TableHead className="w-40">Příležitost</TableHead>
                <TableHead className="w-28">Skóre webu</TableHead>
                <TableHead className="w-28">Stav</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Web</TableHead>
                {showCampaign && <TableHead>Kampaň</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showCampaign ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">
                    Žádné leady.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((l) => (
                  <TableRow key={l.id} data-state={selected.has(l.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(l.id)}
                        onCheckedChange={() => toggle(l.id)}
                        aria-label="Vybrat lead"
                      />
                    </TableCell>
                    <TableCell>
                      <OpportunityBadge opp={oppOf(l)} />
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={l.score} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/leady/${l.id}`} className="hover:text-primary">
                        <span className="block truncate font-medium">{l.businessName}</span>
                        <LeadFlags flags={l.flags} />
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <a href={l.websiteUrl} target="_blank" rel="noreferrer" className="hover:text-primary">
                        {hostOf(l.websiteUrl)}
                      </a>
                    </TableCell>
                    {showCampaign && (
                      <TableCell className="text-xs text-muted-foreground">
                        {l.campaign?.name}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {LEAD_STATUS_ORDER.map((status) => {
            const col = leads
              .filter((l) => l.status === status)
              .sort((a, b) => oppOf(b).score - oppOf(a).score);
            return (
              <div
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/lead");
                  if (id) moveTo(id, status);
                }}
                className="w-56 shrink-0"
              >
                <div className="mb-2 flex items-center justify-between border-b border-border pb-1">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {LEAD_STATUS_LABEL[status]}
                  </span>
                  <span className="font-mono text-xs tabular-nums">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((l) => (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/lead", l.id)}
                      className={cn(
                        "glass glass-hover cursor-grab rounded-xl p-2 active:cursor-grabbing",
                      )}
                    >
                      <Link href={`/leady/${l.id}`} className="block text-sm hover:text-primary">
                        <span className="block truncate">{l.businessName}</span>
                      </Link>
                      <div className="mt-1 flex items-center justify-between">
                        <OpportunityBadge opp={oppOf(l)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
