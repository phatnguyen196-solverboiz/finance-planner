import { Suspense } from "react";
import type { CategorySliceItem } from "@/components/charts/category-pie-chart";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { calculateBudgetStatus } from "@/lib/budget";
import { CATEGORY_META, type CategoryValue } from "@/lib/constants";
import { getExchangeRates } from "@/lib/currency";
import { requirePageUser } from "@/lib/dal";
import { buildTransactionWhereClause, parseFilterParams } from "@/lib/filters";
import {
  analyze503020Rule,
  calculateFinancialHealthAndForecast,
  calculateMonthlyComparisonAndTrend,
} from "@/lib/financial-insights";
import { prisma } from "@/lib/prisma";
import { formatYearMonth } from "@/lib/recurring";
import { getUserBalanceSummary } from "@/lib/server-sync";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function DashboardLoader({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const rawParams = await searchParamsPromise;
  const filters = parseFilterParams(rawParams);
  const referenceDate = new Date();
  const currentMonthKey = formatYearMonth(referenceDate);

  const [
    userPreferences,
    balanceSummary,
    filteredTransactions,
    allTransactionsForAnalytics,
    wishlistItems,
    budgetRows,
    recurringRules,
    ratesSnapshot,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        ruleNeedsPct: true,
        ruleWantsPct: true,
        ruleSavingsPct: true,
      },
    }),
    getUserBalanceSummary(user.id),
    prisma.transaction.findMany({
      where: buildTransactionWhereClause(user.id, filters, referenceDate),
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      select: {
        amount: true,
        type: true,
        category: true,
        date: true,
      },
      orderBy: { date: "desc" },
    }),
    prisma.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.categoryBudget.findMany({
      where: { userId: user.id, month: currentMonthKey },
      orderBy: { category: "asc" },
    }),
    prisma.recurringRule.findMany({
      where: { userId: user.id },
      orderBy: { dayOfMonth: "asc" },
    }),
    getExchangeRates(),
  ]);

  // Tính chi tiêu theo từng danh mục trong tháng hiện tại cho Biểu đồ tròn & Ngân sách
  const currentMonthExpenseByCategory = new Map<CategoryValue, number>();
  let currentMonthTotalExpense = 0;

  for (const tx of allTransactionsForAnalytics) {
    if (tx.type !== "EXPENSE") continue;
    if (formatYearMonth(tx.date) !== currentMonthKey) continue;
    currentMonthTotalExpense += tx.amount;
    currentMonthExpenseByCategory.set(
      tx.category,
      (currentMonthExpenseByCategory.get(tx.category) ?? 0) + tx.amount
    );
  }

  const pieData: CategorySliceItem[] = Array.from(
    currentMonthExpenseByCategory.entries()
  )
    .map(([category, amount]) => ({
      category,
      label: CATEGORY_META[category].label,
      amount,
      percentage:
        currentMonthTotalExpense > 0
          ? Math.round((amount / currentMonthTotalExpense) * 1000) / 10
          : 0,
      color: CATEGORY_META[category].color,
    }))
    .sort((a, b) => b.amount - a.amount);

  const budgets = budgetRows.map((b) => {
    const spent = currentMonthExpenseByCategory.get(b.category) ?? 0;
    const status = calculateBudgetStatus(spent, b.limitAmount);
    return {
      id: b.id,
      category: b.category,
      month: b.month,
      ...status,
    };
  });

  const budgetExceededCount = budgets.filter(
    (b) => b.alertLevel === "EXCEEDED_100"
  ).length;

  let pendingRecurringIncome = 0;
  let pendingRecurringExpense = 0;
  for (const r of recurringRules) {
    if (!r.active || r.lastGeneratedMonth === currentMonthKey) continue;
    if (r.type === "INCOME") pendingRecurringIncome += r.amount;
    else pendingRecurringExpense += r.amount;
  }

  const monthlyTrend = calculateMonthlyComparisonAndTrend(
    allTransactionsForAnalytics,
    referenceDate,
    6
  );

  const rule503020 = analyze503020Rule(
    allTransactionsForAnalytics,
    {
      needsPct: userPreferences?.ruleNeedsPct ?? 50,
      wantsPct: userPreferences?.ruleWantsPct ?? 30,
      savingsPct: userPreferences?.ruleSavingsPct ?? 20,
    },
    referenceDate
  );

  const healthReport = calculateFinancialHealthAndForecast({
    balance: balanceSummary.balance,
    transactions: allTransactionsForAnalytics,
    pendingRecurringIncome,
    pendingRecurringExpense,
    budgetExceededCount,
    referenceDate,
  });

  return (
    <DashboardClient
      user={{ name: user.name, email: user.email }}
      balance={balanceSummary.balance}
      totalIncome={balanceSummary.totalIncome}
      totalExpense={balanceSummary.totalExpense}
      hasAnyTransaction={allTransactionsForAnalytics.length > 0}
      filters={filters}
      transactions={filteredTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        date: tx.date.toISOString(),
        originalCurrency: tx.originalCurrency,
        originalAmount: tx.originalAmount,
        exchangeRate: tx.exchangeRate,
        rateSource: tx.rateSource,
        isRecurringGenerated: tx.isRecurringGenerated,
      }))}
      wishlistItems={wishlistItems.map((w) => ({
        id: w.id,
        name: w.name,
        cost: w.cost,
        priority: w.priority,
        targetDate: w.targetDate ? w.targetDate.toISOString() : null,
        notifiedMilestone: w.notifiedMilestone,
      }))}
      budgets={budgets}
      recurringRules={recurringRules.map((r) => ({
        id: r.id,
        title: r.title,
        amount: r.amount,
        type: r.type,
        category: r.category,
        dayOfMonth: r.dayOfMonth,
        active: r.active,
        lastGeneratedMonth: r.lastGeneratedMonth,
      }))}
      currentMonthKey={currentMonthKey}
      referenceDateIso={referenceDate.toISOString()}
      pieData={pieData}
      monthlyTrend={monthlyTrend}
      rule503020={rule503020}
      healthReport={healthReport}
      ratesSnapshot={ratesSnapshot}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="h-14 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader searchParamsPromise={searchParams} />
    </Suspense>
  );
}
