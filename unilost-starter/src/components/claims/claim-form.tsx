"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { errorMessage, requestApi, useResource } from "@/lib/client-api";
import { validateClaim } from "@/lib/report-validation";
import type { Claim, Item } from "@/types/models";
import ResourceState from "@/components/ui/resource-state";
import styles from "@/components/ui/report.module.css";

export default function ClaimForm({
  itemId,
  initial,
  onSaved,
  onCancel,
}: {
  itemId: string;
  initial?: Claim;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const item = useResource<Item>(itemId ? `/api/items/${itemId}` : null);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const unavailable =
    !item.data ||
    (!initial &&
      (item.data.status === "CLAIMED" || item.data.status === "RETURNED"));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || unavailable) return;
    const form = event.currentTarget,
      input = validateClaim({
        ...Object.fromEntries(new FormData(form)),
        itemId,
      });
    setError("");
    if (input.error !== undefined) {
      setError(input.error);
      return;
    }
    setSaving(true);
    try {
      await requestApi(initial ? `/api/claims/${initial._id}` : "/api/claims", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.data),
      });
      if (!initial) form.reset();
      onSaved();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className={styles.panel}>
      <h2>{initial ? "Edit claim" : "Submit a claim"}</h2>
      {!itemId ? (
        <p className={styles.note}>
          Choose an item from <Link href="/items">the item list</Link>, open its
          details, then select “Submit or view claims”.
        </p>
      ) : (
        <>
          <ResourceState
            loading={item.loading}
            error={item.error}
            retry={item.refresh}
          />
          {item.data && (
            <p className={styles.note}>
              Claiming:{" "}
              <Link href={`/items/${itemId}`}>{item.data.itemName}</Link>
            </p>
          )}
          {!initial && item.data && unavailable && (
            <p role="alert" className={styles.error}>
              This item is already claimed or returned.
            </p>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <form onSubmit={submit} className={styles.form} aria-busy={saving}>
            <fieldset
              disabled={saving || unavailable}
              className={styles.fields}
            >
              <label>
                Claimant name
                <input
                  name="claimantName"
                  required
                  maxLength={120}
                  defaultValue={initial?.claimantName}
                />
              </label>
              <label>
                Contact information
                <input
                  name="contactInformation"
                  required
                  maxLength={200}
                  defaultValue={initial?.contactInformation}
                />
              </label>
              <label>
                Ownership evidence
                <textarea
                  name="description"
                  required
                  maxLength={2000}
                  rows={5}
                  defaultValue={initial?.description}
                />
              </label>
              <p className={styles.hint}>
                Describe identifying details that help establish ownership.
              </p>
              <button className={styles.primary}>
                {saving ? "Saving…" : initial ? "Save claim" : "Submit claim"}
              </button>
            </fieldset>
          </form>
        </>
      )}
      {onCancel && (
        <div className={styles.actions}>
          <button
            className={styles.secondary}
            disabled={saving}
            onClick={onCancel}
          >
            Cancel editing
          </button>
        </div>
      )}
    </section>
  );
}
