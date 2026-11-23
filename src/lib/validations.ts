import { z } from "zod";

export const TransactionTypeEnum = z.enum(["INCOME", "EXPENSE"], {
  error: "Loại giao dịch không hợp lệ",
});

export const CategoryEnum = z.enum(
  [
    "FOOD",
    "TRANSPORT",
    "ENTERTAINMENT",
    "SHOPPING",
    "BILLS",
    "SALARY",
    "INVESTMENT",
    "OTHER",
  ],
  { error: "Danh mục không hợp lệ" }
);

export const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"], {
  error: "Mức ưu tiên không hợp lệ",
});

export const CurrencyEnum = z.enum(["VND", "USD", "EUR"], {
  error: "Loại tiền tệ không hợp lệ",
});

export const entityIdSchema = z
  .string({ error: "Thiếu mã định danh hợp lệ" })
  .trim()
  .min(1, { error: "Mã định danh không được để trống" })
  .max(128, { error: "Mã định danh không hợp lệ" });

export const toggleRecurringRuleSchema = z.object({
  id: entityIdSchema,
  active: z.boolean({ error: "Trạng thái không hợp lệ" }),
});

export const syncRecurringRulesSchema = z.object({
  force: z.boolean({ error: "Tham số đồng bộ không hợp lệ" }).default(false),
});

export const transactionSchema = z
  .object({
    amount: z.coerce
      .number({ error: "Số tiền phải là một số hợp lệ" })
      .positive({ error: "Số tiền phải lớn hơn 0" })
      .max(1_000_000_000_000, { error: "Số tiền quá lớn" }),
    currency: CurrencyEnum.default("VND"),
    description: z
      .string({ error: "Mô tả là bắt buộc" })
      .trim()
      .min(1, { error: "Mô tả phải có ít nhất 1 ký tự" })
      .max(120, { error: "Mô tả tối đa 120 ký tự" }),
    type: TransactionTypeEnum,
    category: CategoryEnum,
    date: z
      .string({ error: "Ngày giao dịch là bắt buộc" })
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        error: "Ngày phải đúng định dạng YYYY-MM-DD",
      })
      .refine((val) => !Number.isNaN(Date.parse(`${val}T12:00:00.000Z`)), {
        error: "Ngày giao dịch không hợp lệ",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.currency === "VND" && !Number.isInteger(data.amount)) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Số tiền VND phải là số nguyên dương",
      });
    }
  });

export const transactionVndSchema = z.object({
  amount: z
    .number({ error: "Số tiền phải là một số" })
    .int({ error: "Số tiền VND phải là số nguyên" })
    .positive({ error: "Số tiền VND phải là số nguyên dương" }),
  description: z
    .string({ error: "Mô tả là bắt buộc" })
    .trim()
    .min(1, { error: "Mô tả phải từ 1 đến 120 ký tự" })
    .max(120, { error: "Mô tả tối đa 120 ký tự" }),
  type: TransactionTypeEnum,
  category: CategoryEnum,
  date: z
    .string({ error: "Ngày giao dịch là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      error: "Ngày phải đúng định dạng YYYY-MM-DD",
    }),
});

export const wishlistItemSchema = z.object({
  name: z
    .string({ error: "Tên món đồ là bắt buộc" })
    .trim()
    .min(1, { error: "Tên món đồ không được để trống" })
    .max(120, { error: "Tên món đồ tối đa 120 ký tự" }),
  cost: z.coerce
    .number({ error: "Giá món đồ phải là một số" })
    .int({ error: "Giá món đồ (VND) phải là số nguyên" })
    .positive({ error: "Giá món đồ phải lớn hơn 0" })
    .max(10_000_000_000_000, { error: "Giá món đồ vượt giới hạn cho phép" }),
  priority: PriorityEnum.default("MEDIUM"),
  targetDate: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined))
    .refine(
      (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
      { error: "Hạn chót phải đúng định dạng YYYY-MM-DD" }
    ),
});

export const budgetSchema = z.object({
  category: CategoryEnum,
  month: z
    .string({ error: "Tháng ngân sách là bắt buộc" })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
      error: "Tháng phải đúng định dạng YYYY-MM",
    }),
  limitAmount: z.coerce
    .number({ error: "Hạn mức ngân sách phải là số" })
    .int({ error: "Hạn mức (VND) phải là số nguyên" })
    .positive({ error: "Hạn mức phải lớn hơn 0" })
    .max(10_000_000_000_000, { error: "Hạn mức vượt giới hạn" }),
});

export const recurringRuleSchema = z.object({
  title: z
    .string({ error: "Tên giao dịch định kỳ là bắt buộc" })
    .trim()
    .min(1, { error: "Tên không được để trống" })
    .max(120, { error: "Tên tối đa 120 ký tự" }),
  amount: z.coerce
    .number({ error: "Số tiền phải là một số" })
    .int({ error: "Số tiền (VND) phải là số nguyên" })
    .positive({ error: "Số tiền phải lớn hơn 0" }),
  type: TransactionTypeEnum,
  category: CategoryEnum,
  dayOfMonth: z.coerce
    .number({ error: "Ngày trong tháng phải là số" })
    .int({ error: "Ngày trong tháng phải là số nguyên" })
    .min(1, { error: "Ngày trong tháng từ 1 đến 28" })
    .max(28, { error: "Ngày trong tháng từ 1 đến 28 (để tương thích mọi tháng)" }),
});

export const rule503020Schema = z
  .object({
    needsPct: z.coerce.number().int().min(0).max(100),
    wantsPct: z.coerce.number().int().min(0).max(100),
    savingsPct: z.coerce.number().int().min(0).max(100),
  })
  .refine((v) => v.needsPct + v.wantsPct + v.savingsPct === 100, {
    error: "Tổng 3 tỷ lệ Thiết yếu + Mong muốn + Tích lũy phải bằng 100%",
    path: ["savingsPct"],
  });

export const aiSuggestSchema = z.object({
  description: z
    .string({ error: "Vui lòng nhập mô tả giao dịch" })
    .trim()
    .min(2, { error: "Mô tả cần tối thiểu 2 ký tự để gợi ý" })
    .max(120, { error: "Mô tả tối đa 120 ký tự" }),
  type: TransactionTypeEnum.optional(),
});

export const loginSchema = z.object({
  email: z.email({ error: "Email không hợp lệ" }),
  password: z
    .string({ error: "Mật khẩu là bắt buộc" })
    .min(6, { error: "Mật khẩu cần tối thiểu 6 ký tự" }),
});

export const registerSchema = z.object({
  name: z
    .string({ error: "Họ tên là bắt buộc" })
    .trim()
    .min(2, { error: "Họ tên cần tối thiểu 2 ký tự" })
    .max(80, { error: "Họ tên tối đa 80 ký tự" }),
  email: z.email({ error: "Email không hợp lệ" }),
  password: z
    .string({ error: "Mật khẩu là bắt buộc" })
    .min(8, { error: "Mật khẩu cần tối thiểu 8 ký tự" })
    .max(128, { error: "Mật khẩu tối đa 128 ký tự" }),
});

export interface ActionErrorResult {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export interface ActionSuccessResult<T = undefined> {
  ok: true;
  message: string;
  data?: T;
}

export type ActionResult<T = undefined> =
  | ActionSuccessResult<T>
  | ActionErrorResult;

export function formatZodActionError(
  error: z.ZodError,
  fallbackMessage = "Dữ liệu nhập không hợp lệ, vui lòng kiểm tra lại."
): ActionErrorResult {
  const flattened = z.flattenError(error);
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(flattened.fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      fieldErrors[key] = messages;
    }
  }
  const firstFormError = flattened.formErrors[0];
  return {
    ok: false,
    message: firstFormError ?? fallbackMessage,
    fieldErrors,
  };
}
