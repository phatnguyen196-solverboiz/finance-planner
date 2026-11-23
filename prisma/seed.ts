import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  Category,
  CurrencyCode,
  PrismaClient,
  TransactionType,
} from "../src/generated/prisma/client";
import { formatYearMonth } from "../src/lib/recurring";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Thiếu biến môi trường DATABASE_URL để chạy seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function daysAgoUtc(daysAgo: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 12, 0, 0)
  );
}

function monthOffsetUtc(monthsAgo: number, day: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, day, 12, 0, 0)
  );
}

async function main() {
  const demoEmail = "demo@financeplanner.vn";
  const demoPassword = "Demo@123456";
  const hashedPassword = await hashPassword(demoPassword);

  let demoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        id: "demo-user-phy10615",
        name: "Nguyễn Minh Khoa (Demo)",
        email: demoEmail,
        emailVerified: true,
        ruleNeedsPct: 50,
        ruleWantsPct: 30,
        ruleSavingsPct: 20,
      },
    });
  }

  const existingCredentialAccount = await prisma.account.findFirst({
    where: {
      userId: demoUser.id,
      providerId: "credential",
    },
  });

  if (!existingCredentialAccount) {
    await prisma.account.create({
      data: {
        id: "demo-credential-account",
        accountId: demoUser.id,
        providerId: "credential",
        userId: demoUser.id,
        password: hashedPassword,
      },
    });
  }

  // Xoá dữ liệu nghiệp vụ cũ của tài khoản demo để seed sạch (idempotent)
  await prisma.transaction.deleteMany({ where: { userId: demoUser.id } });
  await prisma.wishlistItem.deleteMany({ where: { userId: demoUser.id } });
  await prisma.categoryBudget.deleteMany({ where: { userId: demoUser.id } });
  await prisma.recurringRule.deleteMany({ where: { userId: demoUser.id } });

  const currentYearMonth = formatYearMonth(new Date());

  // 36 giao dịch mẫu trải đều 6 tháng gần nhất (>= 30 theo yêu cầu fp1)
  const transactionsData: Array<{
    type: TransactionType;
    amount: number;
    description: string;
    category: Category;
    date: Date;
    originalCurrency?: CurrencyCode;
    originalAmount?: number;
    exchangeRate?: number;
    rateSource?: string;
    isRecurringGenerated?: boolean;
  }> = [
    // Tháng hiện tại (10 giao dịch)
    { type: "INCOME", amount: 18_500_000, description: "Lương kỹ sư phần mềm tháng hiện tại", category: "SALARY", date: monthOffsetUtc(0, 5), isRecurringGenerated: true },
    { type: "INCOME", amount: 3_200_000, description: "Thưởng dự án web freelance", category: "OTHER", date: daysAgoUtc(3) },
    { type: "EXPENSE", amount: 4_500_000, description: "Tiền thuê phòng trọ & dịch vụ", category: "BILLS", date: monthOffsetUtc(0, 2), isRecurringGenerated: true },
    { type: "EXPENSE", amount: 420_000, description: "Hoá đơn điện nước & Wi-Fi", category: "BILLS", date: daysAgoUtc(4) },
    { type: "EXPENSE", amount: 1_850_000, description: "Ăn uống siêu thị & cơm trưa văn phòng", category: "FOOD", date: daysAgoUtc(2) },
    { type: "EXPENSE", amount: 650_000, description: "Cà phê họp nhóm & ăn tối cuối tuần", category: "FOOD", date: daysAgoUtc(1) },
    { type: "EXPENSE", amount: 520_000, description: "Đổ xăng và đi Grab trời mưa", category: "TRANSPORT", date: daysAgoUtc(5) },
    { type: "EXPENSE", amount: 2_350_000, description: "Mua bàn phím cơ & phụ kiện làm việc", category: "SHOPPING", date: daysAgoUtc(6) },
    {
      type: "EXPENSE",
      amount: 508_000,
      description: "Gia hạn gói công cụ lập trình ($20 USD)",
      category: "ENTERTAINMENT",
      date: daysAgoUtc(7),
      originalCurrency: "USD",
      originalAmount: 20,
      exchangeRate: 25400,
      rateSource: "open.er-api.com",
    },
    { type: "EXPENSE", amount: 2_000_000, description: "Góp quỹ chứng chỉ quỹ ETF VN30", category: "INVESTMENT", date: daysAgoUtc(8) },

    // Tháng trước (7 giao dịch)
    { type: "INCOME", amount: 18_000_000, description: "Lương tháng trước", category: "SALARY", date: monthOffsetUtc(1, 5) },
    { type: "INCOME", amount: 1_450_000, description: "Cổ tức quỹ đầu tư", category: "INVESTMENT", date: monthOffsetUtc(1, 18) },
    { type: "EXPENSE", amount: 4_500_000, description: "Tiền thuê trọ tháng trước", category: "BILLS", date: monthOffsetUtc(1, 2) },
    { type: "EXPENSE", amount: 2_600_000, description: "Đi chợ & ăn uống tháng trước", category: "FOOD", date: monthOffsetUtc(1, 12) },
    { type: "EXPENSE", amount: 680_000, description: "Vé xe buýt & xăng xe", category: "TRANSPORT", date: monthOffsetUtc(1, 15) },
    { type: "EXPENSE", amount: 1_900_000, description: "Mua giày chạy bộ", category: "SHOPPING", date: monthOffsetUtc(1, 20) },
    { type: "EXPENSE", amount: 750_000, description: "Xem phim rạp & boardgame", category: "ENTERTAINMENT", date: monthOffsetUtc(1, 22) },

    // 2 tháng trước (6 giao dịch)
    { type: "INCOME", amount: 17_500_000, description: "Lương tháng T-2", category: "SALARY", date: monthOffsetUtc(2, 5) },
    { type: "EXPENSE", amount: 4_400_000, description: "Tiền thuê phòng T-2", category: "BILLS", date: monthOffsetUtc(2, 3) },
    { type: "EXPENSE", amount: 2_450_000, description: "Chi tiêu ăn uống T-2", category: "FOOD", date: monthOffsetUtc(2, 11) },
    { type: "EXPENSE", amount: 590_000, description: "Bảo dưỡng xe máy định kỳ", category: "TRANSPORT", date: monthOffsetUtc(2, 14) },
    { type: "EXPENSE", amount: 1_500_000, description: "Mua đầu tư ETF định kỳ", category: "INVESTMENT", date: monthOffsetUtc(2, 19) },
    { type: "EXPENSE", amount: 980_000, description: "Mua sách kỹ thuật & khoá học", category: "OTHER", date: monthOffsetUtc(2, 24) },

    // 3 tháng trước (5 giao dịch)
    { type: "INCOME", amount: 17_500_000, description: "Lương tháng T-3", category: "SALARY", date: monthOffsetUtc(3, 5) },
    { type: "EXPENSE", amount: 4_400_000, description: "Tiền phòng & điện nước T-3", category: "BILLS", date: monthOffsetUtc(3, 4) },
    { type: "EXPENSE", amount: 2_300_000, description: "Ăn uống hàng ngày T-3", category: "FOOD", date: monthOffsetUtc(3, 14) },
    { type: "EXPENSE", amount: 1_200_000, description: "Du lịch dã ngoại cuối tuần", category: "ENTERTAINMENT", date: monthOffsetUtc(3, 21) },
    { type: "EXPENSE", amount: 1_100_000, description: "Mua sắm quần áo thu đông", category: "SHOPPING", date: monthOffsetUtc(3, 26) },

    // 4 tháng trước (4 giao dịch)
    { type: "INCOME", amount: 16_800_000, description: "Lương tháng T-4", category: "SALARY", date: monthOffsetUtc(4, 5) },
    { type: "EXPENSE", amount: 4_350_000, description: "Tiền trọ & Internet T-4", category: "BILLS", date: monthOffsetUtc(4, 3) },
    { type: "EXPENSE", amount: 2_100_000, description: "Ăn uống & đi chợ T-4", category: "FOOD", date: monthOffsetUtc(4, 16) },
    { type: "EXPENSE", amount: 1_500_000, description: "Tích lũy quỹ ETF T-4", category: "INVESTMENT", date: monthOffsetUtc(4, 22) },

    // 5 tháng trước (4 giao dịch)
    { type: "INCOME", amount: 16_500_000, description: "Lương tháng T-5", category: "SALARY", date: monthOffsetUtc(5, 5) },
    { type: "EXPENSE", amount: 4_300_000, description: "Tiền phòng T-5", category: "BILLS", date: monthOffsetUtc(5, 4) },
    { type: "EXPENSE", amount: 2_050_000, description: "Chi phí ăn uống T-5", category: "FOOD", date: monthOffsetUtc(5, 13) },
    { type: "EXPENSE", amount: 490_000, description: "Di chuyển nội thành T-5", category: "TRANSPORT", date: monthOffsetUtc(5, 19) },
  ];

  await prisma.transaction.createMany({
    data: transactionsData.map((tx) => ({
      ...tx,
      userId: demoUser.id,
      originalCurrency: tx.originalCurrency ?? "VND",
    })),
  });

  // 4 món Wishlist mẫu (Tổng số dư từ 36 giao dịch trên khoảng ~52.9M VND)
  // Đặt các mức giá đa dạng để minh hoạ mốc 100%, 75%, 50% và < 50%
  const now = new Date();
  const nextQuarter = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 28));
  const nextHalfYear = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, 28));

  await prisma.wishlistItem.createMany({
    data: [
      {
        userId: demoUser.id,
        name: "Tai nghe chống ồn Sony WH-1000XM5",
        cost: 8_500_000,
        priority: "MEDIUM",
        targetDate: nextQuarter,
        notifiedMilestone: 100,
      },
      {
        userId: demoUser.id,
        name: "Laptop lập trình 14 inch mới",
        cost: 68_000_000,
        priority: "HIGH",
        targetDate: nextHalfYear,
        notifiedMilestone: 75,
      },
      {
        userId: demoUser.id,
        name: "Chuyến du lịch Đà Nẵng - Hội An",
        cost: 95_000_000,
        priority: "LOW",
        targetDate: nextHalfYear,
        notifiedMilestone: 50,
      },
      {
        userId: demoUser.id,
        name: "Quỹ tự do tài chính năm đầu",
        cost: 150_000_000,
        priority: "HIGH",
        targetDate: new Date(Date.UTC(now.getUTCFullYear() + 1, 11, 31)),
        notifiedMilestone: 0,
      },
    ],
  });

  // 5 ngân sách danh mục tháng hiện tại (thể hiện đủ 3 mức: An toàn <80%, Cảnh báo >=80%, Vượt >=100%)
  await prisma.categoryBudget.createMany({
    data: [
      { userId: demoUser.id, category: "FOOD", month: currentYearMonth, limitAmount: 3_000_000 }, // 2.5M / 3M (~83% -> cảnh báo 80%)
      { userId: demoUser.id, category: "SHOPPING", month: currentYearMonth, limitAmount: 2_000_000 }, // 2.35M / 2M (117.5% -> vượt 100%)
      { userId: demoUser.id, category: "BILLS", month: currentYearMonth, limitAmount: 5_500_000 }, // 4.92M / 5.5M (~89% -> cảnh báo 80%)
      { userId: demoUser.id, category: "TRANSPORT", month: currentYearMonth, limitAmount: 1_200_000 }, // 520k / 1.2M (~43% -> an toàn)
      { userId: demoUser.id, category: "ENTERTAINMENT", month: currentYearMonth, limitAmount: 1_500_000 }, // 508k / 1.5M (~34% -> an toàn)
    ],
  });

  // 3 quy tắc giao dịch định kỳ hàng tháng
  await prisma.recurringRule.createMany({
    data: [
      {
        userId: demoUser.id,
        title: "Lương kỹ sư phần mềm tháng hiện tại",
        amount: 18_500_000,
        type: "INCOME",
        category: "SALARY",
        dayOfMonth: 5,
        active: true,
        lastGeneratedMonth: currentYearMonth,
      },
      {
        userId: demoUser.id,
        title: "Tiền thuê phòng trọ & dịch vụ",
        amount: 4_500_000,
        type: "EXPENSE",
        category: "BILLS",
        dayOfMonth: 2,
        active: true,
        lastGeneratedMonth: currentYearMonth,
      },
      {
        userId: demoUser.id,
        title: "Cước Internet & gói cloud cá nhân",
        amount: 280_000,
        type: "EXPENSE",
        category: "BILLS",
        dayOfMonth: 25,
        active: true,
        lastGeneratedMonth: null, // Chờ đến ngày 25 hoặc bấm sinh thủ công
      },
    ],
  });

  console.log(
    `Seed hoàn tất! Tài khoản demo: ${demoEmail} / ${demoPassword} (${transactionsData.length} giao dịch).`
  );
}

main()
  .catch((error) => {
    console.error("Seed thất bại:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
