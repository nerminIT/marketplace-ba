import type { ReactNode } from "react";

/** Jedinstvena sirina sadrzaja kroz cijeli sajt. */
export default function Container({
  children,
  className = "",
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
}) {
  const width =
    size === "wide"
      ? "max-w-[1400px]"
      : size === "narrow"
        ? "max-w-3xl"
        : "max-w-[1240px]";

  return (
    <div className={`mx-auto w-full ${width} px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
