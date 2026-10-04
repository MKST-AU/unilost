"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateLocation } from "@/lib/validation";
import type { Location } from "@/types/models";
import styles from "./location-manager.module.css";

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

export default function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
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

    requestData<Location[]>("/api/locations", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setLocations(data);
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
    setBuilding("");
    setDescription("");
    setEditingId(null);
  }

  function editLocation(location: Location) {
    setEditingId(location._id);
    setName(location.name);
    setBuilding(location.building);
    setDescription(location.description ?? "");
    setActionError("");
    setMessage("");
    nameInput.current?.focus();
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setActionError("");
    setMessage("");
    const input = validateLocation({ name, building, description });

    if (input.error !== undefined) {
      setActionError(input.error);
      return;
    }

    setSaving(true);

    try {
      const location = await requestData<Location>(
        editingId ? `/api/locations/${editingId}` : "/api/locations",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input.data),
        },
      );
      setLocations((current) =>
        [...current.filter((entry) => entry._id !== location._id), location].sort(
          (a, b) => a.name.localeCompare(b.name),
        ),
      );
      setMessage(editingId ? "Location updated." : "Location created.");
      resetForm();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteLocation(location: Location) {
    if (busy || !window.confirm(`Delete "${location.name}"? This cannot be undone.`)) return;
    setDeletingId(location._id);
    setActionError("");
    setMessage("");

    try {
      await requestData<Location>(`/api/locations/${location._id}`, { method: "DELETE" });
      setLocations((current) => current.filter((entry) => entry._id !== location._id));
      if (editingId === location._id) resetForm();
      setMessage("Location deleted.");
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  const visibleLocations = locations.filter((location) =>
    `${location.name} ${location.building} ${location.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
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
          <h1>Locations</h1>
          <p>Keep lost and found reports easy to browse with clear campus locations.</p>
        </header>

        <div role="status" aria-live="polite">{message && <p className={styles.success}>{message}</p>}</div>
        {actionError && <p role="alert" className={styles.error}>{actionError}</p>}

        <div className={styles.grid}>
          <section className={styles.panel} aria-labelledby="location-form-title">
            <p className={styles.eyebrow}>{editingId ? "MAKE A CHANGE" : "ADD SOMETHING NEW"}</p>
            <h2 id="location-form-title">{editingId ? "Edit location" : "New location"}</h2>
            <p className={styles.hint}>Record where items are lost or found.</p>
            <form onSubmit={saveLocation} aria-busy={saving}>
              <fieldset disabled={busy || loading || Boolean(loadError)} className={styles.fields}>
                <label htmlFor="location-name">Name <span aria-hidden="true">*</span></label>
                <input
                  ref={nameInput}
                  id="location-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Library entrance"
                  required
                  maxLength={120}
                  aria-describedby="name-help"
                />
                <p id="name-help" className={styles.hint}>Required. Up to 120 characters.</p>
                <label htmlFor="location-building">Building <span aria-hidden="true">*</span></label>
                <input id="location-building" value={building} onChange={(event) => setBuilding(event.target.value)} placeholder="e.g. Main Library" required maxLength={120} aria-describedby="building-help" />
                <p id="building-help" className={styles.hint}>Required. Up to 120 characters.</p>
                <label htmlFor="location-description">Description <span className={styles.optional}>Optional</span></label>
                <textarea
                  id="location-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add directions or details about this location."
                  maxLength={500}
                  rows={4}
                  aria-describedby="description-help"
                />
                <p id="description-help" className={styles.counter}>{description.length}/500</p>
                <div className={styles.actions}>
                  <button type="submit" className={styles.primary}>
                    {saving ? "Saving…" : editingId ? "Save changes" : "Create location"}
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

          <section className={styles.listPanel} aria-labelledby="location-list-title" aria-busy={loading}>
            <div className={styles.listHeading}>
              <h2 id="location-list-title">All locations</h2>
              {!loading && !loadError && <span className={styles.badge}>{locations.length}</span>}
            </div>
            <label htmlFor="location-search" className={styles.searchLabel}>Find a location</label>
            <input
              id="location-search"
              className={styles.search}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, building, or description"
              disabled={loading || Boolean(loadError)}
            />

            {loading ? (
              <p role="status" className={styles.empty}>Loading locations…</p>
            ) : loadError ? (
              <div className={styles.empty}>
                <p role="alert">{loadError}</p>
                <button type="button" className={styles.secondary} onClick={() => { setLoadError(""); setLoading(true); setReload((value) => value + 1); }}>Try again</button>
              </div>
            ) : visibleLocations.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon} aria-hidden="true">▦</div>
                <h3>{locations.length === 0 ? "A place for every find" : "No matching locations"}</h3>
                <p>{locations.length === 0 ? "Create your first location to start organizing campus reports." : "Try a different name, building, or description."}</p>
              </div>
            ) : (
              <ul className={styles.list}>
                {visibleLocations.map((location) => (
                  <li key={location._id} className={styles.location}>
                    <div className={styles.locationText}>
                      <h3>{location.name}</h3>
                      <p><strong>Building:</strong> {location.building}</p>
                      <p>{location.description || "No description added."}</p>
                    </div>
                    <div className={styles.rowActions}>
                      <button type="button" disabled={busy} onClick={() => editLocation(location)} aria-label={`Edit ${location.name}`}>Edit</button>
                      <button type="button" disabled={busy} className={styles.delete} onClick={() => deleteLocation(location)} aria-label={`Delete ${location.name}`}>
                        {deletingId === location._id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.footerNote}>Locations used by an item cannot be deleted.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
