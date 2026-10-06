import Link from "next/link";
import type { ReactNode } from "react";
import base from "@/components/categories/category-manager.module.css";
import styles from "./report.module.css";

export default function SiteShell({
  title,
  description,
  active,
  children,
}: {
  title: string;
  description: string;
  active: "dashboard" | "items" | "claims";
  children: ReactNode;
}) {
  return (
    <main className={base.page}>
      <div className={base.container}>
        <nav className={base.nav} aria-label="Main navigation">
          <Link href="/" className={base.brand}>
            UniLost<span>Campus lost &amp; found</span>
          </Link>
          <div className={styles.navLinks}>
            <Link
              href="/"
              aria-current={active === "dashboard" ? "page" : undefined}
            >
              Dashboard
            </Link>
            <Link
              href="/items"
              aria-current={active === "items" ? "page" : undefined}
            >
              Items
            </Link>
            <Link
              href="/claims"
              aria-current={active === "claims" ? "page" : undefined}
            >
              Claims
            </Link>
            <Link href="/categories">Categories</Link>
            <Link href="/locations">Locations</Link>
          </div>
        </nav>
        <header className={`${base.header} ${styles.header}`}>
          <p className={base.eyebrow}>CAMPUS LOST &amp; FOUND</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
