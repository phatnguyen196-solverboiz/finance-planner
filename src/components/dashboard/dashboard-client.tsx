"use client";

import * as React from "react";
import {
  BarChart3,
  LayoutDashboard,
  PiggyBank,
  Plus,
  Target,
} from "lucide-react";
import {
  CategoryPieChart,
  type CategorySliceItem,
} from "@/components/charts/category-pie-chart";
import { MonthlyComparisonChart } from "@/components/charts/monthly-comparison-chart";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { BudgetSummaryItem } from "@/lib/budget";
import type { ExchangeRatesSnapshot } from "@/lib/currency";
import type { TransactionFilters } from "@/lib/filters";
import type {
  FinancialHealthReport,
  MonthlyTrendReport,
  Rule503020Analysis,
} from "@/lib/financial-insights";
import { BudgetSection } from "./budget-section";
import { CsvImportExport } from "./csv-import-export";
import { CurrencyConverterCard } from "./currency-converter-card";
import { FilterBar } from "./filter-bar";
import { FinancialHealthCard } from "./financial-health-card";
import { HeaderNav } from "./header-nav";
import { MilestoneNotifier } from "./milestone-notifier";
import { RecurringSection, type RecurringRuleDto } from "./recurring-section";
import { Rule503020Card } from "./rule-503020-card";
import { SummaryCards } from "./summary-cards";
import {
  TransactionDialog,
  type EditableTransaction,
} from "./transaction-dialog";
import {
  TransactionList,
  type TransactionRowItem,
} from "./transaction-list";
import { WishlistSection, type WishlistItemDto } from "./wishlist-section";

interface DashboardClientProps {
  user: {
    name: string;
    email: string;
  };
  balance: number;
  totalIncome: number;
  totalExpense: number;
  hasAnyTransaction: boolean;
  filters: TransactionFilters;
  transactions: TransactionRowItem[];
  wishlistItems: WishlistItemDto[];
  budgets: BudgetSummaryItem[];
  recurringRules: RecurringRuleDto[];
  currentMonthKey: string;
  referenceDateIso: string;
  pieData: CategorySliceItem[];
  monthlyTrend: MonthlyTrendReport;
  rule503020: Rule503020Analysis;
  healthReport: FinancialHealthReport;
  ratesSnapshot: ExchangeRatesSnapshot;
}

export function DashboardClient({
  user,
  balance,
  totalIncome,
  totalExpense,
  hasAnyTransaction,
  filters,
  transactions,
  wishlistItems,
  budgets,
  recurringRules,
  currentMonthKey,
  referenceDateIso,
  pieData,
  monthlyTrend,
  rule503020,
  healthReport,
  ratesSnapshot,
}: DashboardClientProps) {
  const [txDialogOpen, setTxDialogOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<EditableTransaction | null>(
    null
  );

  function handleOpenCreateTx() {
    setEditingTx(null);
    setTxDialogOpen(true);
  }

  function handleEditTx(item: EditableTransaction) {
    setEditingTx(item);
    setTxDialogOpen(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <HeaderNav
        userName={user.name}
        userEmail={user.email}
        hasTransactions={hasAnyTransaction}
        rateSourceLabel={`${ratesSnapshot.source} (1 USD = ${ratesSnapshot.ratesToVnd.USD.toLocaleString("vi-VN")} ₫)`}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 pb-20 sm:px-6 sm:pb-8">
        <MilestoneNotifier />

        <SummaryCards
          balance={balance}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          healthReport={healthReport}
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value="overview" className="gap-1.5 px-3 py-1.5">
                <LayoutDashboard className="size-4" aria-hidden="true" />
                Tổng quan & Giao dịch
              </TabsTrigger>
              <TabsTrigger value="wishlist" className="gap-1.5 px-3 py-1.5">
                <Target className="size-4" aria-hidden="true" />
                Wishlist ({wishlistItems.length})
              </TabsTrigger>
              <TabsTrigger value="budgets" className="gap-1.5 px-3 py-1.5">
                <PiggyBank className="size-4" aria-hidden="true" />
                Ngân sách & Định kỳ
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5 px-3 py-1.5">
                <BarChart3 className="size-4" aria-hidden="true" />
                Báo cáo & Phân tích
              </TabsTrigger>
            </TabsList>

            <Button type="button" onClick={handleOpenCreateTx}>
              <Plus className="mr-1.5 size-4" aria-hidden="true" />
              Thêm giao dịch
            </Button>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <FilterBar key={filters.q} filters={filters} />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">
                    Danh sách giao dịch ({transactions.length})
                  </h2>
                  <CsvImportExport filters={filters} />
                </div>

                <TransactionList
                  transactions={transactions}
                  onEdit={handleEditTx}
                />
              </div>

              <div className="space-y-6">
                <CategoryPieChart data={pieData} monthLabel={currentMonthKey} />
                <WishlistSection
                  items={wishlistItems}
                  balance={balance}
                  referenceDateIso={referenceDateIso}
                  compact
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wishlist">
            <WishlistSection
              items={wishlistItems}
              balance={balance}
              referenceDateIso={referenceDateIso}
            />
          </TabsContent>

          <TabsContent value="budgets" className="space-y-8">
            <BudgetSection budgets={budgets} currentMonth={currentMonthKey} />
            <RecurringSection rules={recurringRules} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <MonthlyComparisonChart report={monthlyTrend} />
            <div className="grid gap-6 lg:grid-cols-2">
              <Rule503020Card analysis={rule503020} />
              <FinancialHealthCard report={healthReport} />
            </div>
            <CurrencyConverterCard initialRates={ratesSnapshot} />
          </TabsContent>
        </Tabs>
      </main>

      <TransactionDialog
        key={editingTx?.id ?? (txDialogOpen ? "new" : "idle")}
        ratesSnapshot={ratesSnapshot}
        editingItem={editingTx}
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
      />
    </div>
  );
}
