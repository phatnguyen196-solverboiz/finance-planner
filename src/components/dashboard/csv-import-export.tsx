"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildFilterQueryString,
  type TransactionFilters,
} from "@/lib/filters";

interface CsvImportExportProps {
  filters: TransactionFilters;
}

export function CsvImportExport({ filters }: CsvImportExportProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);

  const exportQuery = buildFilterQueryString(filters);
  const exportUrl = exportQuery
    ? `/api/transactions/csv?${exportQuery}`
    : "/api/transactions/csv";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transactions/csv", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        ok?: boolean;
        importedCount?: number;
        skippedCount?: number;
        error?: string;
        errors?: Array<{ row: number; message: string }>;
        newMilestones?: Array<{ message: string }>;
      };

      if (!response.ok || !data.ok) {
        const firstDetail = data.errors?.[0]
          ? ` (Dòng ${data.errors[0].row}: ${data.errors[0].message})`
          : "";
        toast.error((data.error ?? "Tệp CSV không hợp lệ.") + firstDetail);
        return;
      }

      if ((data.skippedCount ?? 0) > 0) {
        toast.warning(
          `Đã nhập ${data.importedCount} giao dịch; bỏ qua ${data.skippedCount} dòng lỗi định dạng.`
        );
      } else {
        toast.success(`Đã nhập thành công ${data.importedCount} giao dịch từ CSV.`);
      }

      for (const note of data.newMilestones ?? []) {
        toast.success(note.message, { duration: 6000 });
      }

      router.refresh();
    } catch {
      toast.error("Có lỗi khi tải lên tệp CSV.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDownloadSample() {
    const sample =
      "date,type,category,amount,description\r\n" +
      "2026-11-15,EXPENSE,FOOD,45000,Bún bò sáng\r\n" +
      "2026-11-15,INCOME,SALARY,15000000,Lương tháng 11\r\n";
    const blob = new Blob([`\uFEFF${sample}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-planner-mau.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={exportUrl} download>
          <Download className="mr-1.5 size-4" aria-hidden="true" />
          Xuất CSV
        </a>
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Chọn tệp CSV để nhập giao dịch"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isImporting}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mr-1.5 size-4" aria-hidden="true" />
        {isImporting ? "Đang kiểm tra CSV..." : "Nhập CSV"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDownloadSample}
      >
        Tải file CSV mẫu
      </Button>
    </div>
  );
}
