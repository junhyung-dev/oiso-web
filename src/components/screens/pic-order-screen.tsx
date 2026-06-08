"use client";

import { useState } from "react";
import { Camera, Check, ImagePlus, Languages, ShoppingBag } from "lucide-react";
import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

const menuItems = [
  { id: "m1", origin: "Pho Bo", translated: "Beef rice noodles", price: "8,000" },
  { id: "m2", origin: "Banh Mi", translated: "Banh mi sandwich", price: "6,500" },
  { id: "m3", origin: "Ca Phe Sua", translated: "Milk coffee", price: "4,500" },
];

export function PicOrderScreen() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";
  const [selectedFile, setSelectedFile] = useState<string>("No image selected");
  const [selectedMenus, setSelectedMenus] = useState<string[]>(["m1"]);

  function toggleMenu(id: string) {
    if (!isAuthenticated) return;
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
            Upload a menu image, review OCR results, and prepare an order.
          </p>
        </div>
        <Button type="button" disabled={!isAuthenticated}>
          <ShoppingBag className="h-4 w-4" />
          Continue order
        </Button>
      </div>

      {!isAuthenticated ? (
        <AuthRequiredCard
          status={status}
          title="Login before uploading a menu"
          description="Image upload, menu OCR, and order completion will be handled as authenticated flows."
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <label className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-card p-6 text-center shadow-soft transition-colors hover:border-primary/60 hover:bg-primary-soft">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={!isAuthenticated}
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0]?.name || "No image selected")
            }
          />
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary-soft text-primary">
            <ImagePlus className="h-7 w-7" />
          </span>
          <span className="mt-4 text-base font-bold">Select menu image</span>
          <span className="mt-2 text-sm text-muted-foreground">
            JPG, PNG, GIF, WEBP
          </span>
          <span className="mt-4 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
            {isAuthenticated ? selectedFile : "Login required"}
          </span>
        </label>

        <div className="rounded-md border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="font-bold">OCR menu candidates</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Results from /v1/ax/get_picnorder or chat streaming.
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
                  disabled={!isAuthenticated}
                  className="flex w-full items-center gap-3 rounded-md border bg-background p-3 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
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
                  <span className="text-sm font-bold">{item.price} KRW</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
