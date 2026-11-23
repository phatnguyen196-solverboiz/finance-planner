# AI_LOG – Nhật ký sử dụng AI

> Mức AI của bài này: Mức 3 (AI cộng tác) cho đồ án cá nhân; Mức 5 (AI Exploration) cho tính năng mở rộng Gợi ý danh mục tự động bằng Gemini API.
> Khai báo trung thực không bị trừ điểm. Không khai báo = vi phạm liêm chính học thuật.

| Ngày | Công cụ | Việc nhờ AI | Prompt (tóm tắt) | Kết quả dùng thế nào | Mình đã kiểm chứng / sửa gì | Commit/PR |
|---|---|---|---|---|---|---|
| 2026-11-15 | Antigravity (Gemini) | Khởi tạo cấu trúc Next.js 16.4 + Tailwind v4 + Prisma 7 + Better Auth 1.7 | Thiết kế kiến trúc Finance Planner theo đúng stack PHY10615 (ghim Prisma 7, proxy.ts, Zod 4, DAL requireUser) | Sinh khung thư mục `src/`, `prisma/schema.prisma`, `prisma.config.ts` | Kiểm tra lại tài liệu Next.js 16.4 trong `node_modules/next/dist/docs` (bọc `<Suspense>` với `cacheComponents: true`) và đọc `get-tables.mjs` của Better Auth 1.7 để khớp schema | Local init |
| 2026-11-15 | Antigravity (Gemini) | Viết các hàm thuần nghiệp vụ & schema Zod 4 | Tách logic lọc URL, tính mốc wishlist, ngân sách 80/100%, định kỳ, CSV, đa tiền tệ, 50/30/20, sức khỏe tài chính | Dùng toàn bộ các hàm thuần tại `src/lib/` | Rà soát công thức kẹp tiến độ âm về 0%, tránh múi giờ lệch ngày bằng UTC, thay `.flatten()` bằng `z.flattenError()` chuẩn Zod 4 | Local init |
| 2026-11-16 | Antigravity (Gemini) | Xây dựng Route Handlers, Server Actions & giao diện Dashboard | Tạo Server Actions kiểm tra `requireUser()` + `updateMany/deleteMany` theo `userId`, UI 4 tab + biểu đồ Recharts có bảng a11y | Sử dụng các action và component tại `src/actions/` và `src/components/` | Kiểm tra mọi truy vấn đều lọc theo `userId` từ session, không lộ secret ra `NEXT_PUBLIC_*`, chạy `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build` | Local init |

## Tự đánh giá cuối bài
- **Phần mình tự làm hoàn toàn / trực tiếp kiểm soát:** Thiết lập cơ sở dữ liệu Neon PostgreSQL, cấu hình `.env` (OAuth GitHub, Gemini API Key), chạy migration/seed dữ liệu thực, kiểm thử luồng trên giao diện thực tế, quản lý Git tags và triển khai lên Vercel.
- **Phần AI giúp nhiều nhất và mình đã hiểu nó thế nào:** Tổ chức ranh giới Server/Client trong Next.js 16.4 App Router (`cacheComponents: true` + `<Suspense>`), cấu hình `@prisma/adapter-pg` trên Prisma ORM 7 (`prisma.config.ts`), và chuẩn hoá bộ hàm thuần dễ viết unit test bằng Vitest 5.
- **Một lần AI sai / có nguy cơ sai và cách mình phát hiện:** Khi kiểm tra npm registry trước khi cài đặt, phát hiện gói `prisma` bản `latest` đang là `8.0.0-rc.33` còn `shadcn init --defaults` chọn `base` thay vì `radix` — đã kịp ghim cứng `prisma@7.10.1` và truyền `-b radix` cho `shadcn` để tuân thủ tuyệt đối luật dự án.
