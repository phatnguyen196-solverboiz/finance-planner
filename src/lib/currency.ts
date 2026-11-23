import type { CurrencyCodeValue } from "./constants";

export interface ExchangeRatesSnapshot {
  base: "VND";
  ratesToVnd: {
    VND: 1;
    USD: number;
    EUR: number;
  };
  fetchedAt: string;
  source: string;
  cached: boolean;
  isFallback: boolean;
}

export const RATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ
export const EXCHANGE_RATE_SOURCE = "open.er-api.com";
export const FALLBACK_RATES_TO_VND = {
  VND: 1 as const,
  USD: 25400,
  EUR: 27400,
};

let rateCache: {
  snapshot: ExchangeRatesSnapshot;
  fetchedAtMs: number;
} | null = null;

export function isRateCacheFresh(
  fetchedAtMs: number,
  nowMs: number = Date.now(),
  ttlMs: number = RATE_CACHE_TTL_MS
): boolean {
  return nowMs - fetchedAtMs < ttlMs;
}

/**
 * Quy đổi số tiền ngoại tệ sang số nguyên dương VND để lưu DB chuẩn theo đề bài.
 */
export function convertToVndInt(
  amount: number,
  currency: CurrencyCodeValue,
  ratesToVnd: { VND: number; USD: number; EUR: number }
): number {
  if (currency === "VND") {
    return Math.round(amount);
  }
  const rate = ratesToVnd[currency];
  return Math.max(1, Math.round(amount * rate));
}

export function convertFromVnd(
  vndAmount: number,
  currency: CurrencyCodeValue,
  ratesToVnd: { VND: number; USD: number; EUR: number }
): number {
  if (currency === "VND") return Math.round(vndAmount);
  const rate = ratesToVnd[currency];
  if (!rate || rate <= 0) return 0;
  return Math.round((vndAmount / rate) * 100) / 100;
}

/**
 * Lấy tỷ giá USD/EUR -> VND từ open.er-api.com với cache 1 giờ và fallback an toàn.
 */
export async function getExchangeRates(): Promise<ExchangeRatesSnapshot> {
  const nowMs = Date.now();
  if (rateCache && isRateCacheFresh(rateCache.fetchedAtMs, nowMs)) {
    return {
      ...rateCache.snapshot,
      cached: true,
    };
  }

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/VND", {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };

    const usdPerVnd = payload.rates?.USD;
    const eurPerVnd = payload.rates?.EUR;

    if (!usdPerVnd || !eurPerVnd || usdPerVnd <= 0 || eurPerVnd <= 0) {
      throw new Error("Invalid exchange rate payload");
    }

    const snapshot: ExchangeRatesSnapshot = {
      base: "VND",
      ratesToVnd: {
        VND: 1,
        USD: Math.round(1 / usdPerVnd),
        EUR: Math.round(1 / eurPerVnd),
      },
      fetchedAt: new Date(nowMs).toISOString(),
      source: EXCHANGE_RATE_SOURCE,
      cached: false,
      isFallback: false,
    };

    rateCache = { snapshot, fetchedAtMs: nowMs };
    return snapshot;
  } catch {
    if (rateCache) {
      return { ...rateCache.snapshot, cached: true };
    }

    return {
      base: "VND",
      ratesToVnd: { ...FALLBACK_RATES_TO_VND },
      fetchedAt: new Date(nowMs).toISOString(),
      source: `${EXCHANGE_RATE_SOURCE} (dự phòng ngoại tuyến)`,
      cached: false,
      isFallback: true,
    };
  }
}

export function clearRateCacheForTest() {
  rateCache = null;
}
