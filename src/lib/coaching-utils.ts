// ── Coaching Helper Utilities ─────────────────────────────────
// Extracted from CoachingContext to keep it under 500 lines.

// ── UUID generator (lightweight, no deps) ───────────────────
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Date helpers ─────────────────────────────────────────────
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function isNewWeek(lastDate: string | null): boolean {
  if (!lastDate) return true;
  const now = new Date();
  const last = new Date(lastDate);
  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };
  return getMonday(now).getTime() > getMonday(last).getTime();
}

export function isNewMonth(lastDate: string | null): boolean {
  if (!lastDate) return true;
  const now = new Date();
  const last = new Date(lastDate);
  return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
}

// ── Merge helpers (remote wins) ──────────────────────────────
export function mergeNudgesById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of remote) map.set(item.id, item);
  for (const item of local) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}
