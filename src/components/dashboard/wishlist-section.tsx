"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  createWishlistItemAction,
  deleteWishlistItemAction,
  updateWishlistItemAction,
} from "@/actions/wishlist-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRIORITY_META,
  formatIsoDateInput,
  formatShortDate,
  formatVnd,
  type PriorityValue,
} from "@/lib/constants";
import {
  calculateSavingsGoalPlan,
  calculateWishlistProgress,
} from "@/lib/milestones";
import { wishlistItemSchema } from "@/lib/validations";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

export interface WishlistItemDto {
  id: string;
  name: string;
  cost: number;
  priority: PriorityValue;
  targetDate: string | null;
  notifiedMilestone: number;
}

interface WishlistItemCardProps {
  item: WishlistItemDto;
  balance: number;
  referenceDateIso?: string;
  onEdit?: (item: WishlistItemDto) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export function WishlistItemCard({
  item,
  balance,
  referenceDateIso,
  onEdit,
  onDelete,
  isDeleting = false,
}: WishlistItemCardProps) {
  const progress = calculateWishlistProgress(balance, item.cost);
  const priorityMeta = PRIORITY_META[item.priority];
  const goalPlan = calculateSavingsGoalPlan(
    balance,
    item.cost,
    item.targetDate,
    referenceDateIso ? new Date(referenceDateIso) : undefined
  );

  return (
    <Card data-testid={`wishlist-card-${item.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{item.name}</CardTitle>
            <Badge variant="outline" className={priorityMeta.badgeClass}>
              Ưu tiên: {priorityMeta.label}
            </Badge>
          </div>
          <CardDescription>
            Mục tiêu: {formatVnd(item.cost)}
            {item.targetDate ? ` · Hạn chót: ${formatShortDate(item.targetDate)}` : ""}
          </CardDescription>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex gap-1">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Sửa ${item.name}`}
                onClick={() => onEdit(item)}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Xoá ${item.name}`}
                disabled={isDeleting}
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="size-4 text-destructive" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Tiến độ tiết kiệm</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <Progress
            value={progress}
            aria-label={`Tiến độ cho ${item.name}`}
            className="h-2.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[50, 75, 100].map((m) => (
            <Badge
              key={m}
              variant={progress >= m ? "default" : "outline"}
              className="text-[11px]"
            >
              Mốc {m}%
            </Badge>
          ))}
        </div>

        {goalPlan && (
          <div className="rounded-lg bg-muted/60 p-2.5 text-xs">
            {goalPlan.isCompleted ? (
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                Đã đủ số dư để mua món đồ mơ ước này!
              </p>
            ) : goalPlan.isOverdue ? (
              <p className="font-medium text-rose-600 dark:text-rose-400">
                Đã qua hạn chót, còn thiếu {formatVnd(goalPlan.remainingAmount)}.
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="size-3.5 shrink-0 text-teal-600" aria-hidden="true" />
                <span>
                  Còn thiếu{" "}
                  <strong className="text-foreground">
                    {formatVnd(goalPlan.remainingAmount)}
                  </strong>{" "}
                  trong {goalPlan.monthsRemaining} tháng → Gợi ý để dành{" "}
                  <strong className="text-teal-700 dark:text-teal-300">
                    {formatVnd(goalPlan.monthlySuggested)}/tháng
                  </strong>
                </span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WishlistSectionProps {
  items: WishlistItemDto[];
  balance: number;
  referenceDateIso?: string;
  compact?: boolean;
  onViewAll?: () => void;
}

export function WishlistSection({
  items,
  balance,
  referenceDateIso,
  compact = false,
  onViewAll,
}: WishlistSectionProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WishlistItemDto | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] =
    React.useState<WishlistItemDto | null>(null);

  const [name, setName] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [priority, setPriority] = React.useState<PriorityValue>("MEDIUM");
  const [targetDate, setTargetDate] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setCost("");
    setPriority("MEDIUM");
    setTargetDate("");
    setFieldErrors({});
    setDialogOpen(true);
  }

  function openEdit(item: WishlistItemDto) {
    setEditing(item);
    setName(item.name);
    setCost(String(item.cost));
    setPriority(item.priority);
    setTargetDate(item.targetDate ? formatIsoDateInput(item.targetDate) : "");
    setFieldErrors({});
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeletingId(id);
    try {
      const res = await deleteWishlistItemAction(id);
      if (res.ok) {
        toast.success(res.message);
        setPendingDelete(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const payload = {
      name,
      cost,
      priority,
      targetDate: targetDate || undefined,
    };

    const parsed = wishlistItemSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = editing
        ? await updateWishlistItemAction(editing.id, payload)
        : await createWishlistItemAction(payload);

      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        toast.error(res.message);
        return;
      }

      toast.success(res.message);
      for (const note of res.data?.newMilestones ?? []) {
        toast.success(note.message, { duration: 6000 });
      }
      setDialogOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayedItems = compact ? items.slice(0, 3) : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold">
            {compact ? "Tiến độ Wishlist" : "Wishlist & Mục tiêu tiết kiệm"}
          </h2>
        </div>

        {compact ? (
          onViewAll && (
            <Button type="button" variant="ghost" size="xs" onClick={onViewAll}>
              Quản lý ({items.length}) →
            </Button>
          )
        ) : (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            Thêm món mong muốn
          </Button>
        )}
      </div>

      {displayedItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Chưa có món đồ mơ ước nào trong Wishlist.
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            compact ? "grid gap-3" : "grid gap-4 md:grid-cols-2"
          }
        >
          {displayedItems.map((item) => (
            <WishlistItemCard
              key={item.id}
              item={item}
              balance={balance}
              referenceDateIso={referenceDateIso}
              onEdit={compact ? undefined : openEdit}
              onDelete={
                compact
                  ? undefined
                  : (id) => {
                      const found = items.find((w) => w.id === id);
                      if (found) setPendingDelete(found);
                    }
              }
              isDeleting={deletingId === item.id}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Cập nhật món Wishlist" : "Thêm món đồ mong muốn"}
            </DialogTitle>
            <DialogDescription>
              Đặt hạn chót để nhận gợi ý số tiền cần tiết kiệm mỗi tháng.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="wl-name">Tên món đồ</Label>
              <Input
                id="wl-name"
                placeholder="Ví dụ: Chiếc laptop mới"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "wl-name-error" : undefined}
              />
              {fieldErrors.name?.[0] && (
                <p id="wl-name-error" role="alert" className="text-xs text-destructive">
                  {fieldErrors.name[0]}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="wl-cost">Giá mục tiêu (VND)</Label>
                <Input
                  id="wl-cost"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="25000000"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.cost)}
                  aria-describedby={fieldErrors.cost ? "wl-cost-error" : undefined}
                />
                {fieldErrors.cost?.[0] && (
                  <p id="wl-cost-error" role="alert" className="text-xs text-destructive">
                    {fieldErrors.cost[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wl-priority">Mức ưu tiên</Label>
                <Select
                  value={priority}
                  onValueChange={(val) => setPriority(val as PriorityValue)}
                >
                  <SelectTrigger id="wl-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Thấp</SelectItem>
                    <SelectItem value="MEDIUM">Trung bình</SelectItem>
                    <SelectItem value="HIGH">Cao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wl-target-date">Hạn chót mục tiêu (tuỳ chọn)</Label>
              <Input
                id="wl-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                aria-invalid={Boolean(fieldErrors.targetDate)}
              />
              {fieldErrors.targetDate?.[0] && (
                <p role="alert" className="text-xs text-destructive">
                  {fieldErrors.targetDate[0]}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Huỷ
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
                )}
                {editing ? "Lưu thay đổi" : "Thêm vào Wishlist"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Xoá món Wishlist?"
        description={
          pendingDelete
            ? `Bạn chắc chắn muốn xoá "${pendingDelete.name}" (${formatVnd(pendingDelete.cost)}) khỏi Wishlist?`
            : ""
        }
        isLoading={Boolean(pendingDelete && deletingId === pendingDelete.id)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
