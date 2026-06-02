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
}: {
  id: string;
  isVercel: boolean;
  hidden: boolean;
  redirect?: string;
}) {
  const router = useRouter();

  function done() {
    if (redirect) router.push(redirect);
    router.refresh();
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
