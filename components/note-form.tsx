"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/note`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Poznámku se nepodařilo uložit");
        return;
      }
      toast.success("Poznámka přidána");
      setText("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ruční poznámka k leadu…"
        rows={3}
      />
      <Button size="sm" variant="outline" disabled={loading || !text.trim()} onClick={add}>
        Přidat poznámku
      </Button>
    </div>
  );
}
