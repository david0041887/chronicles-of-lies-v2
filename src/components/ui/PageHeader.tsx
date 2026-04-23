import { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  align?: "left" | "center";
}

/**
 * Unified page header — eyebrow + title + optional subtitle + action slot.
 * Replaces bespoke per-page hero blocks.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  align = "left",
}: Props) {
  const centered = align === "center";
  return (
    <div
      className={`mb-6 flex flex-col sm:flex-row sm:items-end gap-3 ${
        centered ? "sm:flex-col sm:items-center sm:text-center" : "sm:justify-between"
      }`}
    >
      <div className={centered ? "text-center" : ""}>
        {eyebrow && (
          <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-[10px] sm:text-xs uppercase mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="display-serif text-3xl sm:text-4xl text-sacred leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-parchment/60 text-xs sm:text-sm mt-1 max-w-xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
