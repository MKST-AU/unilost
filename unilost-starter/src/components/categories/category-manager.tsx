"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateCategory } from "@/lib/validation";
import type { Category } from "@/types/models";
import styles from "./category-manager.module.css";

async function requestData<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error ?? "Something went wrong. Please try again.");
  }

  return result.data as T;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const busy = saving || deletingId !== null;

  useEffect(() => {
    const controller = new AbortController();

    requestData<Category[]>("/api/categories", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setCategories(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reload]);

  function resetForm() {
    setName("");
    setDescription("");
    setEditingId(null);
  }

  function editCategory(category: Category) {
    setEditingId(category._id);
    setName(category.name);
    setDescription(category.description ?? "");
    setActionError("");
    setMessage("");
    nameInput.current?.focus();
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setActionError("");
    setMessage("");
    const input = validateCategory({ name, description });

    if (input.error !== undefined) {
      setActionError(input.error);
      return;
    }

    setSaving(true);

    try {
      const category = await requestData<Category>(
        editingId ? `/api/categories/${editingId}` : "/api/categories",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input.data),
        },
      );
      setCategories((current) =>
        [...current.filter((entry) => entry._id !== category._id), category].sort(
          (a, b) => a.name.localeCompare(b.name),
        ),
      );
      setMessage(editingId ? "Category updated." : "Category created.");
      resetForm();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (busy || !window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    setDeletingId(category._id);
    setActionError("");
    setMessage("");

    try {
      await requestData<Category>(`/api/categories/${category._id}`, { method: "DELETE" });
      setCategories((current) => current.filter((entry) => entry._id !== category._id));
      if (editingId === category._id) resetForm();
      setMessage("Category deleted.");
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  const visibleCategories = categories.filter((category) =>
    `${category.name} ${category.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/" className={styles.brand}>UniLost<span>Campus lost &amp; found</span></Link>
          <Link href="/">Back to dashboard <span aria-hidden="true">↗</span></Link>
        </nav>

        <header className={styles.header}>
          <p className={styles.eyebrow}>ORGANIZE YOUR CAMPUS</p>
          <h1>Categories</h1>
          <p>Keep lost and found reports easy to browse with clear, useful categories.</p>
        </header>

        <div role="status" aria-live="polite">{message && <p className={styles.success}>{message}</p>}</div>
        {actionError && <p role="alert" className={styles.error}>{actionError}</p>}

        <div className={styles.grid}>
          <section className={styles.panel} aria-labelledby="category-form-title">
            <p className={styles.eyebrow}>{editingId ? "MAKE A CHANGE" : "ADD SOMETHING NEW"}</p>
            <h2 id="category-form-title">{editingId ? "Edit category" : "New category"}</h2>
            <p className={styles.hint}>Give similar items a place to belong.</p>
            <form onSubmit={saveCategory} aria-busy={saving}>
              <fieldset disabled={busy || loading || Boolean(loadError)} className={styles.fields}>
                <label htmlFor="category-name">Name <span aria-hidden="true">*</span></label>
                <input
                  ref={nameInput}
                  id="category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Electronics"
                  required
                  maxLength={80}
                  aria-describedby="name-help"
                />
                <p id="name-help" className={styles.hint}>Required. Use a unique name, up to 80 characters.</p>
                <label htmlFor="category-description">Description <span className={styles.optional}>Optional</span></label>
                <textarea
                  id="category-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What kinds of items belong here?"
                  maxLength={500}
                  rows={4}
                  aria-describedby="description-help"
                />
                <p id="description-help" className={styles.counter}>{description.length}/500</p>
                <div className={styles.actions}>
                  <button type="submit" className={styles.primary}>
                    {saving ? "Saving…" : editingId ? "Save changes" : "Create category"}
                  </button>
                  {editingId && (
                    <button type="button" className={styles.secondary} onClick={() => { resetForm(); setActionError(""); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </fieldset>
            </form>
          </section>

          <section className={styles.listPanel} aria-labelledby="category-list-title" aria-busy={loading}>
            <div className={styles.listHeading}>
              <h2 id="category-list-title">All categories</h2>
              {!loading && !loadError && <span className={styles.badge}>{categories.length}</span>}
            </div>
            <label htmlFor="category-search" className={styles.searchLabel}>Find a category</label>
            <input
              id="category-search"
              className={styles.search}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or description"
              disabled={loading || Boolean(loadError)}
            />

            {loading ? (
              <p role="status" className={styles.empty}>Loading categories…</p>
            ) : loadError ? (
              <div className={styles.empty}>
                <p role="alert">{loadError}</p>
                <button type="button" className={styles.secondary} onClick={() => { setLoadError(""); setLoading(true); setReload((value) => value + 1); }}>Try again</button>
              </div>
            ) : visibleCategories.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon} aria-hidden="true">▦</div>
                <h3>{categories.length === 0 ? "A place for every find" : "No matching categories"}</h3>
                <p>{categories.length === 0 ? "Create your first category to start organizing campus reports." : "Try a different name or description."}</p>
              </div>
            ) : (
              <ul className={styles.list}>
                {visibleCategories.map((category) => (
                  <li key={category._id} className={styles.category}>
                    <div className={styles.categoryText}>
                      <h3>{category.name}</h3>
                      <p>{category.description || "No description added."}</p>
                    </div>
                    <div className={styles.rowActions}>
                      <button type="button" disabled={busy} onClick={() => editCategory(category)} aria-label={`Edit ${category.name}`}>Edit</button>
                      <button type="button" disabled={busy} className={styles.delete} onClick={() => deleteCategory(category)} aria-label={`Delete ${category.name}`}>
                        {deletingId === category._id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.footerNote}>Categories used by an item cannot be deleted.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
