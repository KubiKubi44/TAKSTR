"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "default" | "sm" | "lg" | "icon";

export function ActionButton({
  endpoint,
  body,
  children,
  variant = "outline",
  size = "sm",
  successMessage = "Hotovo",
  confirm,
  disabled,
  className,
  onDone,
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  successMessage?: string;
  confirm?: string;
  disabled?: boolean;
  className?: string;
  onDone?: (data: unknown) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? `Chyba ${res.status}`);
        return;
      }
      toast.success(successMessage);
      onDone?.(data);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={run}
      disabled={loading || disabled}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? "…" : children}
    </Button>
  );
}
