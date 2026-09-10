"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProductStatus } from "@/app/actions/products";

const NEXT: Record<string, { to: "draft" | "active"; label: string }> = {
  draft: { to: "active", label: "Objavi" },
  archived: { to: "active", label: "Vrati u ponudu" },
  active: { to: "draft", label: "Skloni" },
};

/** Brza promjena statusa direktno iz liste proizvoda. */
export default function ProductStatusButton({
  id,
  status,
}: {
  id: number;
  status: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  const action = NEXT[status];
  if (!action) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        startTransition(async () => {
          await setProductStatus(id, action.to);
          router.refresh();
        })
      }
      className="text-xs text-ink-2 transition-colors hover:text-brand disabled:opacity-50"
    >
      {busy ? "..." : action.label}
    </button>
  );
}
