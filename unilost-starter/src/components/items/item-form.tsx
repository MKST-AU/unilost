"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { errorMessage, requestApi, useResource } from "@/lib/client-api";
import { validateItem } from "@/lib/report-validation";
import {
  ITEM_STATUSES,
  type Category,
  type Item,
  type Location,
} from "@/types/models";
import styles from "@/components/ui/report.module.css";

export default function ItemForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Item;
  onSaved: (item: Item) => void;
  onCancel?: () => void;
}) {
  const categories = useResource<Category[]>("/api/categories"),
    locations = useResource<Location[]>("/api/locations");
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<Item | null>(null);
  const ready = Boolean(categories.data?.length && locations.data?.length);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !ready) return;
    const form = event.currentTarget,
      values = Object.fromEntries(new FormData(form));
    if (initial && values.date === initial.date.slice(0, 10))
      values.date = initial.date;
    const input = validateItem(values);
    setError("");
    setSaved(null);
    if (input.error !== undefined) {
      setError(input.error);
      return;
    }
    setSaving(true);
    try {
      const { data } = await requestApi<Item>(
        initial ? `/api/items/${initial._id}` : "/api/items",
        {
          method: initial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input.data,
            ...(initial ? { status: values.status } : {}),
          }),
        },
      );
      setSaved(data);
      if (!initial) form.reset();
      onSaved(data);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className={styles.panel} aria-labelledby="item-form-title">
      <h2 id="item-form-title">{initial ? "Edit item" : "Report an item"}</h2>
      <p className={styles.hint}>
        All fields are required. Add enough detail to help identify the item.
      </p>
      {(categories.loading || locations.loading) && (
        <p role="status" className={styles.hint}>
          Loading categories and locations…
        </p>
      )}
      {categories.error && (
        <div className={styles.error}>
          <p role="alert">Categories unavailable: {categories.error}</p>
          <button className={styles.secondary} onClick={categories.refresh}>
            Retry categories
          </button>
        </div>
      )}
      {locations.error && (
        <div className={styles.error}>
          <p role="alert">
            Locations unavailable: {locations.error} Reporting and editing will
            be available when locations are ready.
          </p>
          <button className={styles.secondary} onClick={locations.refresh}>
            Retry locations
          </button>
        </div>
      )}
      {categories.data?.length === 0 && (
        <p role="alert" className={styles.note}>
          Create a <Link href="/categories">category</Link> before reporting an
          item.
        </p>
      )}
      {locations.data?.length === 0 && (
        <p role="alert" className={styles.note}>
          No locations are available. <Link href="/locations">Add a location</Link>
          {" "}before reporting an item.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className={styles.success}>
          {initial ? "Item updated." : "Item reported."}{" "}
          <Link href={`/items/${saved._id}`}>View item</Link>
        </p>
      )}
      <form onSubmit={submit} className={styles.form} aria-busy={saving}>
        <fieldset className={styles.fields} disabled={saving || !ready}>
          <label>
            Item name
            <input
              name="itemName"
              required
              maxLength={120}
              defaultValue={initial?.itemName}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              required
              maxLength={2000}
              rows={4}
              defaultValue={initial?.description}
            />
          </label>
          <label>
            Report type
            <select
              aria-label="Report type"
              name="type"
              defaultValue={initial?.type ?? "LOST"}
            >
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
            </select>
          </label>
          <label>
            Category
            <select
              aria-label="Category"
              name="categoryId"
              required
              defaultValue={initial?.categoryId ?? ""}
            >
              <option value="" disabled>
                Select a category
              </option>
              {initial &&
                categories.data &&
                !categories.data.some((c) => c._id === initial.categoryId) && (
                  <option value={initial.categoryId} disabled>
                    Previous category unavailable
                  </option>
                )}
              {categories.data?.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Location
            <select
              aria-label="Location"
              name="locationId"
              required
              defaultValue={initial?.locationId ?? ""}
            >
              <option value="" disabled>
                Select a location
              </option>
              {initial &&
                locations.data &&
                !locations.data.some((l) => l._id === initial.locationId) && (
                  <option value={initial.locationId} disabled>
                    Previous location unavailable
                  </option>
                )}
              {locations.data?.map((location) => (
                <option key={location._id} value={location._id}>
                  {location.name} — {location.building}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date lost or found
            <input
              name="date"
              type="date"
              required
              defaultValue={initial?.date.slice(0, 10)}
            />
          </label>
          {initial && (
            <>
              <label>
                Status
                <select
                  aria-label="Status"
                  name="status"
                  defaultValue={initial.status}
                >
                  {ITEM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <p className={styles.hint}>
                Approve a claim before marking CLAIMED. Mark RETURNED only after
                handover.
              </p>
            </>
          )}
          <button className={styles.primary} type="submit">
            {saving ? "Saving…" : initial ? "Save changes" : "Report item"}
          </button>
        </fieldset>
        {onCancel && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={saving}
              onClick={onCancel}
            >
              Cancel editing
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
