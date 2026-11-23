import { z } from "zod";
import { formatIsoDateInput, type CategoryValue, type TransactionTypeValue } from "./constants";
import { transactionVndSchema } from "./validations";

export interface CsvExportRow {
  date: Date | string;
  type: TransactionTypeValue;
  category: CategoryValue;
  amount: number;
  description: string;
}

export interface ParsedCsvTransaction {
  date: Date;
  type: TransactionTypeValue;
  category: CategoryValue;
  amount: number;
  description: string;
}

export interface CsvImportValidationError {
  row: number;
  message: string;
}

export const CSV_HEADERS = [
  "date",
  "type",
  "category",
  "amount",
  "description",
] as const;

function escapeCsvCell(value: string): string {
  // Ngăn chặn CSV Formula Injection (=, +, -, @) khi mở trên Excel
  const formulaSafe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

/**
 * Xuất danh sách giao dịch sang chuỗi CSV chuẩn RFC 4180 kèm UTF-8 BOM.
 */
export function serializeTransactionsToCsv(rows: CsvExportRow[]): string {
  const headerLine = CSV_HEADERS.join(",");
  const dataLines = rows.map((row) =>
    [
      escapeCsvCell(formatIsoDateInput(row.date)),
      escapeCsvCell(row.type),
      escapeCsvCell(row.category),
      String(Math.round(row.amount)),
      escapeCsvCell(row.description),
    ].join(",")
  );
  return `\uFEFF${[headerLine, ...dataLines].join("\r\n")}`;
}

/**
 * Tách một dòng CSV hỗ trợ dấu ngoặc kép và dấu phẩy bên trong ngoặc.
 */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Phân tích và kiểm tra định dạng CSV nhập vào bằng Zod 4.
 */
export function parseAndValidateCsvTransactions(csvText: string): {
  validRows: ParsedCsvTransaction[];
  errors: CsvImportValidationError[];
} {
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) {
    return {
      validRows: [],
      errors: [{ row: 1, message: "Tệp CSV trống." }],
    };
  }

  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: [
        {
          row: 1,
          message:
            "CSV cần có dòng tiêu đề (date,type,category,amount,description) và ít nhất 1 dòng dữ liệu.",
        },
      ],
    };
  }

  const headerCells = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const missingHeaders = CSV_HEADERS.filter((h) => !headerCells.includes(h));
  if (missingHeaders.length > 0) {
    return {
      validRows: [],
      errors: [
        {
          row: 1,
          message: `Thiếu cột bắt buộc trong tiêu đề CSV: ${missingHeaders.join(", ")}`,
        },
      ],
    };
  }

  const idxDate = headerCells.indexOf("date");
  const idxType = headerCells.indexOf("type");
  const idxCategory = headerCells.indexOf("category");
  const idxAmount = headerCells.indexOf("amount");
  const idxDesc = headerCells.indexOf("description");

  const validRows: ParsedCsvTransaction[] = [];
  const errors: CsvImportValidationError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const cells = splitCsvLine(lines[i]);
    if (cells.length < CSV_HEADERS.length) {
      errors.push({
        row: rowNumber,
        message: "Số lượng cột không khớp với dòng tiêu đề.",
      });
      continue;
    }

    const rawAmount = Number(cells[idxAmount]);
    const parsed = transactionVndSchema.safeParse({
      date: cells[idxDate],
      type: cells[idxType].toUpperCase(),
      category: cells[idxCategory].toUpperCase(),
      amount: rawAmount,
      description: cells[idxDesc],
    });

    if (!parsed.success) {
      const flat = z.flattenError(parsed.error);
      const firstErr =
        Object.values(flat.fieldErrors).flat()[0] ??
        flat.formErrors[0] ??
        "Dữ liệu không hợp lệ";
      errors.push({ row: rowNumber, message: firstErr });
      continue;
    }

    validRows.push({
      date: new Date(`${parsed.data.date}T12:00:00.000Z`),
      type: parsed.data.type,
      category: parsed.data.category,
      amount: parsed.data.amount,
      description: parsed.data.description,
    });
  }

  return { validRows, errors };
}
