import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

interface CardProps {
  title?: string;
  /** "Xem tất cả" style link in the header. */
  link?: { href: "/" | "/wallets" | "/categories"; label: string };
  className?: string;
  children: ReactNode;
}

export function Card({ title, link, className, children }: CardProps) {
  return (
    <section className={cx("flex flex-col gap-4 rounded-3xl bg-surface p-5 sm:p-6", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">{title}</h2>
          {link ? (
            <Link
              href={link.href}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              {link.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
