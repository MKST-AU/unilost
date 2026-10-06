"use client";
import Link from "next/link";
import { useResource } from "@/lib/client-api";
import type { DashboardSummary } from "@/types/models";
import SiteShell from "@/components/ui/site-shell";
import ResourceState from "@/components/ui/resource-state";
import styles from "@/components/ui/report.module.css";

export default function Dashboard() {
  const summary = useResource<DashboardSummary>("/api/dashboard"),
    data = summary.data;
  return (
    <SiteShell
      title="A little help. A happy return."
      description="A shared place for campus lost-and-found reports, ownership claims, and successful returns."
      active="dashboard"
    >
      <div className={styles.stack}>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/items">
            Browse & report items
          </Link>
          <Link className={styles.secondary} href="/claims">
            Review claims
          </Link>
          <button className={styles.secondary} onClick={summary.refresh}>
            Refresh summary
          </button>
        </div>
        <ResourceState
          loading={summary.loading}
          error={summary.error}
          retry={summary.refresh}
        />
        {data && (
          <>
            <section className={styles.stats} aria-label="Campus summary">
              {(
                [
                  ["Total items", data.totalItems],
                  ["Currently lost", data.lostItems],
                  ["Currently found", data.foundItems],
                  ["Claimed items", data.claimedItems],
                  ["Returned items", data.returnedItems],
                  ["Pending claims", data.pendingClaims],
                  ["Approved claims", data.approvedClaims],
                  ["Rejected claims", data.rejectedClaims],
                ] as const
              ).map(([label, count]) => (
                <div className={styles.stat} key={label}>
                  <strong>{count}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </section>
            <p className={styles.hint}>
              Item counts use current status. Refresh the summary after changes
              in another tab.
            </p>
            <section className={styles.panel}>
              <div className={styles.heading}>
                <h2>Latest reports</h2>
                <Link className={styles.secondary} href="/items">
                  View all items
                </Link>
              </div>
              {data.recentItems.length === 0 ? (
                <div className={styles.empty}>
                  <h3>No reports yet</h3>
                  <p>Report a lost or found item to get started.</p>
                </div>
              ) : (
                <ul className={styles.list}>
                  {data.recentItems.map((item) => (
                    <li key={item._id} className={styles.card}>
                      <span className={styles.badge}>{item.status}</span>
                      <h3>
                        <Link href={`/items/${item._id}`}>{item.itemName}</Link>
                      </h3>
                      <p className={styles.meta}>
                        {item.category?.name ?? "Category unavailable"} ·{" "}
                        {item.location?.name ?? "Location unavailable"} ·{" "}
                        {item.date.slice(0, 10)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </SiteShell>
  );
}
