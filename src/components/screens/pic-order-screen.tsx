"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPicNOrder } from "@/lib/api/ax";
import type {
  OrderableMenuItem,
  PicNOrderOcrStructure,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const USER_LANGUAGE = "Korean";
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function createUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const digit = char === "x" ? value : (value & 0x3) | 0x8;
    return digit.toString(16);
  });
}

function formatCurrency(price: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(price);
}

function toOrderItems(ocr: PicNOrderOcrStructure): OrderableMenuItem[] {
  return ocr.menus.map((menu, index) => {
    const originalName = menu.text_in_original_language.trim();
    const userLanguageName = menu.text_in_user_language.trim();

    return {
      id: `${menu.number}-${index}`,
      number: menu.number,
      originalName,
      displayName: userLanguageName || originalName || `Menu ${menu.number}`,
      price: menu.price,
      quantity: 0,
    };
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "메뉴판을 분석하지 못했습니다. 다른 사진을 시도해 주세요.";
}

export function PicOrderScreen() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrStructure, setOcrStructure] =
    useState<PicNOrderOcrStructure | null>(null);
  const [items, setItems] = useState<OrderableMenuItem[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  const selectedItems = useMemo(
    () => items.filter((item) => item.quantity > 0),
    [items],
  );

  const totalQuantity = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems],
  );

  const totalPrice = useMemo(
    () =>
      selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedItems],
  );

  const unknownPriceCount = useMemo(
    () => selectedItems.filter((item) => item.price <= 0).length,
    [selectedItems],
  );

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearSelection() {
    setSelectedFile(null);
    setFileError(null);
    setOcrError(null);
    setOcrStructure(null);
    setItems([]);
    setIsConfirmOpen(false);
    resetFileInput();
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setOcrError(null);
    setOcrStructure(null);
    setItems([]);
    setIsConfirmOpen(false);

    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }

    setSelectedFile(file);
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setFileError("JPG, PNG, GIF, WEBP 형식의 이미지만 업로드할 수 있습니다.");
      return;
    }

    setFileError(null);
  }

  async function submitOcr(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || fileError || isSubmitting) return;

    if (!SUPPORTED_IMAGE_TYPES.has(selectedFile.type)) {
      setFileError("JPG, PNG, GIF, WEBP 형식의 이미지만 업로드할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    setOcrError(null);

    try {
      const response = await getPicNOrder({
        uuid: createUuid(),
        userLanguage: USER_LANGUAGE,
        pic: selectedFile,
      });

      if (!response.ocr_structure?.menus.length) {
        setOcrStructure(null);
        setItems([]);
        setOcrError("인식된 메뉴가 없습니다. 다른 사진을 시도해 주세요.");
        return;
      }

      setOcrStructure(response.ocr_structure);
      setItems(toOrderItems(response.ocr_structure));
    } catch (error) {
      setOcrStructure(null);
      setItems([]);
      setOcrError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeQuantity(itemId: string, delta: number) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item,
      ),
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pic & Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            메뉴판 사진을 인식해 주문 확인서를 만듭니다.
          </p>
        </div>
        <div className="rounded-md border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground">
          User language: {USER_LANGUAGE}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form className="space-y-3" onSubmit={submitOcr}>
          <label
            className={cn(
              "flex min-h-[360px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed bg-card p-5 text-center shadow-soft transition-colors hover:border-primary/60 hover:bg-primary-soft",
              fileError && "border-destructive/50 bg-destructive/5",
              isSubmitting && "cursor-wait opacity-80",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              disabled={isSubmitting}
              onChange={onFileChange}
            />
            {previewUrl ? (
              <div className="flex w-full flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="선택한 메뉴판 미리보기"
                    className="h-full max-h-[280px] w-full object-contain"
                  />
                </div>
                <span className="mt-3 block truncate text-sm font-bold">
                  {selectedFile?.name}
                </span>
              </div>
            ) : (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <ImagePlus className="h-7 w-7" />
                </span>
                <span className="mt-4 text-base font-bold">메뉴판 이미지 선택</span>
                <span className="mt-2 text-sm text-muted-foreground">
                  JPG, PNG, GIF, WEBP
                </span>
              </>
            )}
          </label>

          {fileError ? (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{fileError}</span>
            </div>
          ) : null}

          {ocrError ? (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{ocrError}</span>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Button
              type="submit"
              disabled={!selectedFile || Boolean(fileError) || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {isSubmitting ? "인식 중" : "메뉴 인식"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || !selectedFile}
              onClick={clearSelection}
            >
              <RotateCcw className="h-4 w-4" />
              다른 사진
            </Button>
          </div>
        </form>

        <div className="rounded-md border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="font-bold">인식된 메뉴</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {ocrStructure
                  ? `${ocrStructure.original_language} → ${ocrStructure.user_language}`
                  : "OCR 결과가 여기에 표시됩니다."}
              </p>
            </div>
            {ocrStructure ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <ReceiptText className="h-5 w-5 text-primary" />
            )}
          </div>

          {isSubmitting ? (
            <div className="mt-4 flex min-h-[260px] items-center justify-center rounded-md bg-background text-sm font-semibold text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              메뉴판을 분석하는 중입니다.
            </div>
          ) : null}

          {!isSubmitting && items.length === 0 ? (
            <div className="mt-4 flex min-h-[260px] items-center justify-center rounded-md bg-background px-4 text-center text-sm text-muted-foreground">
              메뉴판 이미지를 선택하고 OCR 요청을 보내면 메뉴 목록이 표시됩니다.
            </div>
          ) : null}

          {!isSubmitting && items.length > 0 ? (
            <div className="mt-4 space-y-3">
              {items.map((item) => {
                const showOriginalName =
                  item.originalName && item.originalName !== item.displayName;
                const subtotal = item.price * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-2">
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-primary-soft px-2 text-xs font-bold text-primary">
                          {item.number}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words font-bold text-foreground">
                            {item.displayName}
                          </p>
                          {showOriginalName ? (
                            <p className="mt-1 break-words text-sm text-muted-foreground">
                              {item.originalName}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span
                          className={cn(
                            "rounded-md px-2 py-1",
                            item.price > 0
                              ? "bg-primary-soft text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {item.price > 0
                            ? formatCurrency(item.price)
                            : "가격 확인 필요"}
                        </span>
                        {item.quantity > 0 ? (
                          <span className="text-muted-foreground">
                            subtotal:{" "}
                            {item.price > 0
                              ? formatCurrency(subtotal)
                              : "가격 확인 필요"}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`${item.displayName} 수량 감소`}
                        disabled={item.quantity === 0}
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span
                        className="flex h-10 w-12 items-center justify-center rounded-md border bg-card text-sm font-extrabold"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={`${item.displayName} 수량 증가`}
                        onClick={() => changeQuantity(item.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-16 z-10 rounded-md border bg-card p-3 shadow-soft lg:bottom-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">
              총 {totalQuantity}개 · {formatCurrency(totalPrice)}
            </p>
            {unknownPriceCount > 0 ? (
              <p className="mt-1 text-xs font-semibold text-destructive">
                가격 확인 필요 메뉴 {unknownPriceCount}개
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                선택된 메뉴만 주문 확인서에 표시됩니다.
              </p>
            )}
          </div>
          <Button
            type="button"
            disabled={selectedItems.length === 0}
            onClick={() => setIsConfirmOpen(true)}
          >
            <ShoppingBag className="h-4 w-4" />
            주문하기
          </Button>
        </div>
      </div>

      {isConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pic-order-confirm-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-md bg-card p-4 shadow-soft sm:mx-auto sm:max-w-2xl sm:rounded-md sm:p-5"
          >
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <h2 id="pic-order-confirm-title" className="text-xl font-extrabold">
                  주문 확인
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  상인에게 보여줄 주문 내용입니다.
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="주문 확인 닫기"
                onClick={() => setIsConfirmOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedItems.map((item) => {
                const subtotal = item.price * item.quantity;
                const showDisplayName =
                  item.displayName && item.displayName !== item.originalName;

                return (
                  <div
                    key={item.id}
                    className="rounded-md border bg-background p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-lg font-extrabold">
                          {item.originalName || item.displayName}
                        </p>
                        {showDisplayName ? (
                          <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">
                            {item.displayName}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-md bg-primary-soft px-3 py-1 text-lg font-extrabold text-primary">
                        x {item.quantity}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-muted-foreground sm:grid-cols-2">
                      <span>
                        단가:{" "}
                        {item.price > 0
                          ? formatCurrency(item.price)
                          : "가격 확인 필요"}
                      </span>
                      <span className="sm:text-right">
                        subtotal:{" "}
                        {item.price > 0
                          ? formatCurrency(subtotal)
                          : "가격 확인 필요"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-md bg-primary-soft p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-primary">총 수량</span>
                <span className="text-xl font-extrabold">{totalQuantity}개</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-primary">총액</span>
                <span className="text-xl font-extrabold">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              {unknownPriceCount > 0 ? (
                <p className="mt-3 rounded-md bg-card px-3 py-2 text-sm font-bold text-destructive">
                  가격 확인 필요 메뉴 {unknownPriceCount}개가 있습니다.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
