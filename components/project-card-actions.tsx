"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProjectCardActions({
  id,
  isVercel,
  hidden,
  redirect,
  currentName,
}: {
  id: string;
  isVercel: boolean;
  hidden: boolean;
  redirect?: string;
  currentName?: string;
}) {
  const router = useRouter();

  function done() {
    if (redirect) router.push(redirect);
    router.refresh();
  }

  async function rename() {
    const next = window.prompt(
      isVercel
        ? "Vlastní název projektu (prázdné = původní z Vercelu):"
        : "Název projektu:",
      currentName ?? "",
    );
    if (next === null) return;
    const res = await fetch(`/api/projects/${id}/rename`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    if (res.ok) {
      toast.success("Přejmenováno");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Nepovedlo se");
    }
  }

  async function setHidden(h: boolean) {
    const res = await fetch(`/api/projects/${id}/hide`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hidden: h }),
    });
    if (res.ok) {
      toast.success(h ? "Skryto" : "Zobrazeno");
      done();
    } else {
      toast.error("Nepovedlo se");
    }
  }

  async function remove() {
    if (!window.confirm("Smazat projekt? Nevratné.")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Smazáno");
      done();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Nepovedlo se");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Akce" />}
      >
        ⋯
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={rename}>Přejmenovat</DropdownMenuItem>
        {hidden ? (
          <DropdownMenuItem onClick={() => setHidden(false)}>
            Zobrazit
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => setHidden(true)}>
            Skrýt
          </DropdownMenuItem>
        )}
        {!isVercel && (
          <DropdownMenuItem variant="destructive" onClick={remove}>
            Smazat
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
