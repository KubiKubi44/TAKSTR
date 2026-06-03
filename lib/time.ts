// Časové helpery mimo render komponent (kvůli react-hooks/purity pravidlu,
// které zakazuje Date.now() přímo v těle komponenty).

export function isPast(d: Date | string | null | undefined): boolean {
  if (!d) return false;
  return new Date(d).getTime() <= Date.now();
}
