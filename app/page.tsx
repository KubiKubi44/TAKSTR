export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-xl border border-border p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Fáze 0 · scaffold
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Lead-gen &amp; outreach
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Interní nástroj na vyhledávání potenciálních klientů, jejich analýzu
          a poloautomatické oslovování. Žádný e-mail neodejde bez schválení.
        </p>
        <dl className="mt-8 space-y-2 font-mono text-xs">
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="text-muted-foreground">Dashboard</dt>
            <dd>fáze 5</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="text-muted-foreground">Kampaně</dt>
            <dd>fáze 2 / 5</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="text-muted-foreground">Leady</dt>
            <dd>fáze 2 / 5</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
