"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteCampaignButton({
  campaignId,
  campaignName,
  leadCount,
}: {
  campaignId: string;
  campaignName: string;
  leadCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    const msg =
      leadCount > 0
        ? `Smazat kampaň „${campaignName}" včetně ${leadCount} leadů (a jejich analýz, draftů, historie)? Nevratné.`
        : `Smazat kampaň „${campaignName}"?`;
    if (!window.confirm(msg)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Smazání selhalo");
        return;
      }
      toast.success("Kampaň smazána");
      router.push("/kampane");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:text-destructive"
      disabled={loading}
      onClick={remove}
    >
      Smazat
    </Button>
  );
}
