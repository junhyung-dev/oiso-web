"use client";

import { useState } from "react";
import { Camera, Check, ImagePlus, Languages, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { id: "m1", origin: "Pho Bo", translated: "소고기 쌀국수", price: "8,000" },
  { id: "m2", origin: "Banh Mi", translated: "반미 샌드위치", price: "6,500" },
  { id: "m3", origin: "Ca Phe Sua", translated: "연유 커피", price: "4,500" },
];

export function PicOrderScreen() {
  const [selectedFile, setSelectedFile] = useState<string>("선택된 이미지 없음");
  const [selectedMenus, setSelectedMenus] = useState<string[]>(["m1"]);

  function toggleMenu(id: string) {
    setSelectedMenus((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pic & Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            메뉴판 이미지를 올리고 OCR 결과에서 주문 후보를 고릅니다.
          </p>
        </div>
        <Button type="button">
          <ShoppingBag className="h-4 w-4" />
          주문 진행
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <label className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-card p-6 text-center shadow-soft transition-colors hover:border-primary/60 hover:bg-primary-soft">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0]?.name || "선택된 이미지 없음")
            }
          />
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary-soft text-primary">
            <ImagePlus className="h-7 w-7" />
          </span>
          <span className="mt-4 text-base font-bold">메뉴판 이미지 선택</span>
          <span className="mt-2 text-sm text-muted-foreground">
            JPG, PNG, GIF, WEBP
          </span>
          <span className="mt-4 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
            {selectedFile}
          </span>
        </label>

        <div className="rounded-md border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="font-bold">OCR 메뉴 후보</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                `/v1/ax/get_picnorder` 또는 chat streaming 결과 표시 영역
              </p>
            </div>
            <Languages className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {menuItems.map((item) => {
              const checked = selectedMenus.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleMenu(item.id)}
                  className="flex w-full items-center gap-3 rounded-md border bg-background p-3 text-left transition-colors hover:border-primary/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    {checked ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.translated}</span>
                    <span className="block text-sm text-muted-foreground">
                      {item.origin}
                    </span>
                  </span>
                  <span className="text-sm font-bold">{item.price}원</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
