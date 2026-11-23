import { GoogleGenAI } from "@google/genai";
import { CATEGORY_LIST, type CategoryValue, type TransactionTypeValue } from "./constants";

export interface CategorySuggestionResult {
  category: CategoryValue;
  confidence: "high" | "medium";
  source: "gemini" | "fallback";
  reason: string;
  sanitizedDescription: string;
}

const VALID_CATEGORIES = new Set<string>(CATEGORY_LIST);

// Rate limiter trong bộ nhớ: tối đa 10 lượt gọi AI mỗi phút cho mỗi userId
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const userRequestTimestamps = new Map<string, number[]>();

/**
 * Loại bỏ dữ liệu cá nhân (email, số điện thoại, số tài khoản/CCCD, URL) trước khi gửi lên Gemini.
 */
export function sanitizeDescriptionForAi(raw: string): string {
  return raw
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/https?:\/\/\S+/gi, "[URL]")
    .replace(/\b(?:\+?84|0)(?:[\s.-]?\d){8,10}\b/g, "[PHONE]")
    .replace(/\b\d{9,19}\b/g, "[NUMBER]")
    .trim()
    .slice(0, 120);
}

export function checkAiRateLimit(
  userId: string,
  nowMs: number = Date.now()
): { allowed: boolean; retryAfterSec: number } {
  const existing = userRequestTimestamps.get(userId) ?? [];
  const validWindow = existing.filter((t) => nowMs - t < RATE_LIMIT_WINDOW_MS);

  if (validWindow.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = validWindow[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (nowMs - oldest)) / 1000)
    );
    userRequestTimestamps.set(userId, validWindow);
    return { allowed: false, retryAfterSec };
  }

  validWindow.push(nowMs);
  userRequestTimestamps.set(userId, validWindow);
  return { allowed: true, retryAfterSec: 0 };
}

export function suggestCategoryByKeywords(
  description: string,
  type?: TransactionTypeValue
): { category: CategoryValue; reason: string } {
  const lower = description.toLowerCase();

  if (type === "INCOME") {
    if (/(lương|salary|thưởng|bonus|trợ cấp|tiền công|freelance)/.test(lower)) {
      return { category: "SALARY", reason: "Mô tả liên quan đến lương hoặc thu nhập công việc." };
    }
    if (/(lãi|cổ tức|chứng khoán|đầu tư|tiết kiệm|dividend|invest)/.test(lower)) {
      return { category: "INVESTMENT", reason: "Mô tả liên quan đến lợi nhuận đầu tư." };
    }
    return { category: "OTHER", reason: "Khoản thu nhập khác." };
  }

  if (/(ăn|uống|cơm|phở|bún|trà sữa|cà phê|coffee|cafe|nhà hàng|bữa|siêu thị thực phẩm|grabfood|shopeefood)/.test(lower)) {
    return { category: "FOOD", reason: "Từ khóa liên quan đến ăn uống / thực phẩm." };
  }
  if (/(xăng|grab|be|gojek|taxi|xe buýt|vé xe|tàu|máy bay|gửi xe|di chuyển|bảo dưỡng xe)/.test(lower)) {
    return { category: "TRANSPORT", reason: "Từ khóa liên quan đến đi lại / phương tiện." };
  }
  if (/(điện|nước|internet|wifi|4g|tiền nhà|tiền trọ|thuê phòng|hoá đơn|hóa đơn|chung cư|rác)/.test(lower)) {
    return { category: "BILLS", reason: "Từ khóa liên quan đến hoá đơn định kỳ hoặc tiền trọ." };
  }
  if (/(phim|rạp|netflix|spotify|game|du lịch|karaoke|concert|giải trí|sách|bida)/.test(lower)) {
    return { category: "ENTERTAINMENT", reason: "Từ khóa liên quan đến giải trí / thư giãn." };
  }
  if (/(mua|áo|quần|giày|shopee|lazada|tiki|điện thoại|laptop|tai nghe|mỹ phẩm|đồ gia dụng)/.test(lower)) {
    return { category: "SHOPPING", reason: "Từ khóa liên quan đến mua sắm hàng hóa." };
  }
  if (/(chứng khoán|cổ phiếu|trái phiếu|quỹ mở|vàng|crypto|đầu tư|tiết kiệm)/.test(lower)) {
    return { category: "INVESTMENT", reason: "Từ khóa liên quan đến đầu tư tài chính." };
  }
  if (/(lương|salary|thưởng)/.test(lower)) {
    return { category: "SALARY", reason: "Từ khóa liên quan đến tiền lương." };
  }

  return { category: "OTHER", reason: "Không khớp nhóm cụ thể, xếp vào Khác." };
}

/**
 * Gợi ý danh mục bằng Gemini API phía server.
 * Không gửi thông tin người dùng/PII, có rate-limit và fallback an toàn khi thiếu key hoặc lỗi API.
 */
export async function suggestCategoryWithGemini(
  rawDescription: string,
  userId: string,
  type?: TransactionTypeValue
): Promise<{ ok: true; data: CategorySuggestionResult } | { ok: false; error: string; status: number }> {
  const rateCheck = checkAiRateLimit(userId);
  if (!rateCheck.allowed) {
    return {
      ok: false,
      error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${rateCheck.retryAfterSec} giây.`,
      status: 429,
    };
  }

  const sanitizedDescription = sanitizeDescriptionForAi(rawDescription);
  if (sanitizedDescription.length < 2) {
    return {
      ok: false,
      error: "Mô tả sau khi ẩn thông tin nhạy cảm quá ngắn để phân tích.",
      status: 400,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const fallback = suggestCategoryByKeywords(sanitizedDescription, type);
    return {
      ok: true,
      data: {
        category: fallback.category,
        confidence: "medium",
        source: "fallback",
        reason: `${fallback.reason} (Chế độ ngoại tuyến do chưa cấu hình GEMINI_API_KEY)`,
        sanitizedDescription,
      },
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = [
      "Bạn là trợ lý phân loại giao dịch tài chính cá nhân.",
      "Chỉ dựa vào mô tả giao dịch ngắn bên dưới, hãy chọn ĐÚNG 1 mã danh mục trong danh sách:",
      "FOOD, TRANSPORT, ENTERTAINMENT, SHOPPING, BILLS, SALARY, INVESTMENT, OTHER.",
      `Loại giao dịch (nếu biết): ${type ?? "UNKNOWN"}.`,
      `Mô tả: "${sanitizedDescription}"`,
      'Trả về JSON thuần theo đúng dạng: {"category":"FOOD","reason":"lý do ngắn gọn bằng tiếng Việt dưới 15 từ"}',
    ].join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 120,
      },
    });

    const text = response.text?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        category?: string;
        reason?: string;
      };
      const candidate = parsed.category?.toUpperCase().trim() ?? "";
      if (VALID_CATEGORIES.has(candidate)) {
        return {
          ok: true,
          data: {
            category: candidate as CategoryValue,
            confidence: "high",
            source: "gemini",
            reason:
              typeof parsed.reason === "string" && parsed.reason.trim()
                ? parsed.reason.trim().slice(0, 140)
                : "Phân loại tự động bởi Gemini AI.",
            sanitizedDescription,
          },
        };
      }
    }

    throw new Error("Invalid Gemini JSON category output");
  } catch {
    const fallback = suggestCategoryByKeywords(sanitizedDescription, type);
    return {
      ok: true,
      data: {
        category: fallback.category,
        confidence: "medium",
        source: "fallback",
        reason: `${fallback.reason} (Tự động chuyển sang bộ quy tắc dự phòng)`,
        sanitizedDescription,
      },
    };
  }
}

export function clearAiRateLimitForTest() {
  userRequestTimestamps.clear();
}
