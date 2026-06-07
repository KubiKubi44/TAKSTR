// Drobné příznaky z triáže/analýzy, barevně dle závažnosti.
const TONE = {
  danger: "border-destructive/45 text-destructive",
  warn: "border-gold/45 text-gold",
  info: "border-info/45 text-info",
} as const;

export function LeadFlags({ flags }: { flags: Record<string, unknown> }) {
  const items: { t: string; tone: keyof typeof TONE }[] = [];
  if (flags?.socialOnly || flags?.noRealWebsite) items.push({ t: "jen sociální síť", tone: "info" });
  if (flags?.websiteUnreachable) items.push({ t: "web nedostupný", tone: "danger" });
  if (flags?.sslExpired) items.push({ t: "prošlé SSL", tone: "danger" });
  if (flags?.noHttps) items.push({ t: "bez HTTPS", tone: "danger" });
  if (flags?.domainExpiringSoon) items.push({ t: "doména expiruje", tone: "warn" });
  if (flags?.techStale) items.push({ t: "zastaralý web", tone: "warn" });
  if (items.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap gap-1">
      {items.map((it) => (
        <span
          key={it.t}
          className={`border border-dashed px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONE[it.tone]}`}
        >
          {it.t}
        </span>
      ))}
    </span>
  );
}
