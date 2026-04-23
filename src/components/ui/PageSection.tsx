import { ReactNode } from "react";

interface Props {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Consistent section wrapper — title + subtitle + optional trailing action.
 */
export function PageSection({
  title,
  subtitle,
  action,
  children,
  className = "",
}: Props) {
  return (
    <section className={`mb-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title && (
              <h2 className="display-serif text-lg sm:text-xl text-sacred leading-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-parchment/50 tracking-wide mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
