"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useResource } from "@/lib/client-api";
import {
  ITEM_STATUSES,
  type Item,
  type Category,
  type Location,
} from "@/types/models";
import SiteShell from "@/components/ui/site-shell";
import ResourceState from "@/components/ui/resource-state";
import Pagination from "@/components/ui/pagination";
import ItemForm from "./item-form";
import styles from "@/components/ui/report.module.css";

export default function ItemManager({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery),
    [page, setPage] = useState(1);
  const items = useResource<Item[]>(`/api/items?${query}&page=${page}`);
  const categories = useResource<Category[]>("/api/categories"),
    locations = useResource<Location[]>("/api/locations");
  const initial = new URLSearchParams(initialQuery);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget))
      if (typeof value === "string" && value.trim())
        params.set(key, value.trim());
    setPage(1);
    setQuery(params.toString());
    items.refresh();
  }
  return (
    <SiteShell
      title="Lost & found items"
      description="Report something missing, share a find, or help an item get home."
      active="items"
    >
      <div className={styles.grid}>
        <ItemForm
          onSaved={() => {
            setPage(1);
            items.refresh();
          }}
        />
        <section className={styles.panel} aria-labelledby="items-heading">
          <div className={styles.heading}>
            <h2 id="items-heading">Browse reports</h2>
            <button className={styles.secondary} onClick={items.refresh}>
              Refresh items
            </button>
          </div>
          <form className={styles.filters} onSubmit={filter}>
            <label className={styles.wide}>
              Search items
              <input
                name="q"
                type="search"
                maxLength={120}
                defaultValue={initial.get("q") ?? ""}
                placeholder="Search names and descriptions"
              />
            </label>
            <label>
              Report type
              <select
                aria-label="Report type"
                name="type"
                defaultValue={initial.get("type") ?? ""}
              >
                <option value="">All types</option>
                <option value="LOST">Lost</option>
                <option value="FOUND">Found</option>
              </select>
            </label>
            <label>
              Item status
              <select
                aria-label="Item status"
                name="status"
                defaultValue={initial.get("status") ?? ""}
              >
                <option value="">All statuses</option>
                {ITEM_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Filter by category
              <select
                aria-label="Filter by category"
                name="categoryId"
                defaultValue={initial.get("categoryId") ?? ""}
                disabled={!categories.data?.length}
              >
                <option value="">All categories</option>
                {categories.data?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Filter by location
              <select
                aria-label="Filter by location"
                name="locationId"
                defaultValue={initial.get("locationId") ?? ""}
                disabled={!locations.data?.length}
              >
                <option value="">All locations</option>
                {locations.data?.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={`${styles.actions} ${styles.wide}`}>
              <button className={styles.primary} type="submit">
                Apply filters
              </button>
              <button
                className={styles.secondary}
                type="button"
                onClick={(event) => {
                  const fields = event.currentTarget.form?.elements;
                  if (fields)
                    for (const field of fields) {
                      if (
                        field instanceof HTMLInputElement ||
                        field instanceof HTMLSelectElement
                      )
                        field.value = "";
                    }
                  setQuery("");
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            </div>
          </form>
          <ResourceState
            loading={items.loading}
            error={items.error}
            retry={items.refresh}
          />
          {items.data && (
            <>
              <p role="status" className={styles.hint}>
                {items.pagination?.total ?? items.data.length} matching reports
              </p>
              {items.data.length === 0 ? (
                <div className={styles.empty}>
                  <h3>No items found</h3>
                  <p>Try fewer filters or report the first item.</p>
                </div>
              ) : (
                <ul className={styles.list}>
                  {items.data.map((item) => (
                    <li key={item._id} className={styles.card}>
                      <span className={styles.badge}>{item.status}</span>
                      <h3>
                        <Link href={`/items/${item._id}`}>{item.itemName}</Link>
                      </h3>
                      <p className={styles.description}>
                        {item.description.length > 200
                          ? `${item.description.slice(0, 200)}…`
                          : item.description}
                      </p>
                      <p className={styles.meta}>
                        {item.category?.name ?? "Category unavailable"} ·{" "}
                        {item.location?.name ?? "Location unavailable"} ·{" "}
                        {item.date.slice(0, 10)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Pagination info={items.pagination} change={setPage} />
            </>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
