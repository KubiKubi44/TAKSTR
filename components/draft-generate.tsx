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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function DraftGenerate({
  leadId,
  hasDraft,
}: {
  leadId: string;
  hasDraft: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [instruction, setInstruction] = useState("");

  async function generate(editInstruction?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/draft`, {
        method: "POST",
        headers: editInstruction ? { "content-type": "application/json" } : undefined,
        body: editInstruction ? JSON.stringify({ editInstruction }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? `Chyba ${res.status}`);
        return;
      }
      toast.success(`Draft v${data.version} hotový`);
      setEditOpen(false);
      setInstruction("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" disabled={loading} onClick={() => generate()}>
        {hasDraft ? "Nová verze" : "Generovat draft"}
      </Button>
      {hasDraft && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => setEditOpen(true)}>
          Upravit
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Úprava draftu</DialogTitle>
            <DialogDescription>
              Napiš, co změnit. Vznikne nová verze z poslední jako základu.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Zkrať to o třetinu a přidej konkrétní příklad z jejich webu."
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Zrušit
            </Button>
            <Button
              disabled={loading || !instruction.trim()}
              onClick={() => generate(instruction.trim())}
            >
              {loading ? "Generuji…" : "Vytvořit verzi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
