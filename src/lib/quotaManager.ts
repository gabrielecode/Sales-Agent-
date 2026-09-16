const STORAGE_KEY = 'AFFILIATE_AGENT_SENT_TODAY';

interface DailyQuotaRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailySentCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const data: DailyQuotaRecord = JSON.parse(raw);
    const today = getTodayString();
    if (data.date !== today) {
      // Different day: reset
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
      return 0;
    }
    return typeof data.count === 'number' ? data.count : 0;
  } catch {
    return 0;
  }
}

export function recordDailySentCount(increment: number): number {
  if (typeof window === 'undefined' || increment <= 0) return getDailySentCount();
  try {
    const today = getTodayString();
    const current = getDailySentCount();
    const newCount = current + increment;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
    return newCount;
  } catch {
    return getDailySentCount();
  }
}

export function getRemainingDailyQuota(limit: number): number {
  const sent = getDailySentCount();
  return Math.max(0, limit - sent);
}
