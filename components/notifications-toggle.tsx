"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// převod VAPID public key (base64url) na Uint8Array pro pushManager.subscribe
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Status = "unknown" | "unsupported" | "off" | "on" | "busy";

export function NotificationsToggle() {
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? "on" : "off");
      } catch {
        setStatus("off");
      }
    })();
  }, []);

  async function enable() {
    setStatus("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Oznámení nejsou povolena v telefonu.");
        setStatus("off");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        toast.error("Chybí VAPID klíč (env).");
        setStatus("off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) {
        toast.error("Nepovedlo se uložit odběr.");
        setStatus("off");
        return;
      }
      toast.success("Oznámení zapnutá 🔔");
      setStatus("on");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chyba");
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      toast.success("Oznámení vypnutá");
      setStatus("off");
    } catch {
      setStatus("on");
    }
  }

  async function test() {
    const res = await fetch("/api/push/test", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    toast.success(`Test odeslán (${d.sent ?? 0} zařízení)`);
  }

  if (status === "unknown" || status === "unsupported") return null;

  if (status === "on") {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={test}>
          🔔 Test
        </Button>
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={disable}>
          Vypnout
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={status === "busy"} onClick={enable}>
      {status === "busy" ? "…" : "🔔 Zapnout oznámení"}
    </Button>
  );
}
