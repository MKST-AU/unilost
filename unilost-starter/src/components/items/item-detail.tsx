"use client";
import Link from "next/link";
import { useState } from "react";
import { errorMessage, requestApi, useResource } from "@/lib/client-api";
import type { Item } from "@/types/models";
import SiteShell from "@/components/ui/site-shell";
import ResourceState from "@/components/ui/resource-state";
import ItemForm from "./item-form";
import styles from "@/components/ui/report.module.css";

export default function ItemDetail({ id }: { id: string }) {
  const resource = useResource<Item>(`/api/items/${id}`),
    item = resource.data;
  const [editing, setEditing] = useState(false),
    [deleting, setDeleting] = useState(false),
    [deleted, setDeleted] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function remove() {
    if (
      !item ||
      deleting ||
      !window.confirm(`Delete "${item.itemName}"? This cannot be undone.`)
    )
      return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      await requestApi(`/api/items/${id}`, { method: "DELETE" });
      setDeleted(true);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }
  return (
    <SiteShell
      title={item?.itemName ?? "Item details"}
      description="Review a report, keep its details up to date, and record a successful return."
      active="items"
    >
      <div className={styles.stack}>
        <Link href="/items" className={styles.secondary}>
          ← Back to items
        </Link>
        {deleted ? (
          <p role="status" className={styles.success}>
            Item deleted. <Link href="/items">Return to the item list</Link>
          </p>
        ) : (
          <>
            <ResourceState
              loading={resource.loading}
              error={resource.error}
              retry={resource.refresh}
            />
            {message && (
              <p role="status" className={styles.success}>
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            {item &&
              (editing ? (
                <ItemForm
                  key={item._id}
                  initial={item}
                  onSaved={() => {
                    setEditing(false);
                    setMessage("Item updated.");
                    resource.refresh();
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <section className={styles.panel}>
                  <span className={styles.badge}>{item.status}</span>
                  <dl className={styles.details}>
                    <div>
                      <dt>Report type</dt>
                      <dd>{item.type}</dd>
                    </div>
                    <div>
                      <dt>Date lost or found</dt>
                      <dd>{item.date.slice(0, 10)}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{item.category?.name ?? "Category unavailable"}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>
                        {item.location
                          ? `${item.location.name} — ${item.location.building}`
                          : "Location unavailable"}
                      </dd>
                    </div>
                    <div>
                      <dt>Reported at (UTC)</dt>
                      <dd>
                        {item.createdAt.replace("T", " ").replace("Z", "")}
                      </dd>
                    </div>
                  </dl>
                  <h2>Description</h2>
                  <p className={styles.description}>{item.description}</p>
                  <div className={styles.actions}>
                    <button
                      className={styles.primary}
                      disabled={deleting}
                      onClick={() => {
                        setEditing(true);
                        setMessage("");
                        setError("");
                      }}
                    >
                      Edit item
                    </button>
                    <button
                      className={styles.danger}
                      disabled={deleting}
                      onClick={remove}
                    >
                      {deleting ? "Deleting…" : "Delete item"}
                    </button>
                    <Link
                      className={styles.secondary}
                      href={`/claims?itemId=${item._id}`}
                    >
                      {item.status === "LOST" || item.status === "FOUND"
                        ? "Submit or view claims"
                        : "View claims"}
                    </Link>
                  </div>
                  <p className={styles.hint}>
                    Items with claims cannot be deleted. Keep approved claims as
                    the record of a completed return.
                  </p>
                </section>
              ))}
          </>
        )}
      </div>
    </SiteShell>
  );
}
