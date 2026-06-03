"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteExpenseButton({ id }: { id: string }) {
  const router = useRouter();
  async function remove() {
    if (!window.confirm("Smazat výdaj?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Smazáno");
      router.refresh();
    } else {
      toast.error("Nepovedlo se");
    }
  }
  return (
    <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={remove} aria-label="Smazat">
      ✕
    </Button>
  );
}
