// Drobné příznaky z triáže (jen sociální síť / web nedostupný).
export function LeadFlags({ flags }: { flags: Record<string, unknown> }) {
  const items: string[] = [];
  if (flags?.socialOnly || flags?.noRealWebsite) items.push("jen sociální síť");
  if (flags?.websiteUnreachable) items.push("web nedostupný");
  if (flags?.sslExpired) items.push("prošlé SSL");
  if (flags?.noHttps) items.push("bez HTTPS");
  if (flags?.domainExpiringSoon) items.push("doména expiruje");
  if (flags?.techStale) items.push("zastaralý web");
  if (items.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap gap-1">
      {items.map((t) => (
        <span
          key={t}
          className="border border-dashed border-muted-foreground/40 px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          {t}
        </span>
      ))}
    </span>
  );
}
