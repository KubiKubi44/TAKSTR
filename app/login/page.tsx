"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Přihlášení selhalo");
        return;
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-sm gap-5 p-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            TAK · interní
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
            Přihlášení
          </h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Heslo"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "…" : "Vstoupit"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
