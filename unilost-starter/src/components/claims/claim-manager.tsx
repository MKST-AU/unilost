"use client";
import Link from "next/link";
import { useState } from "react";
import { errorMessage, requestApi, useResource } from "@/lib/client-api";
import { CLAIM_STATUSES, type Claim } from "@/types/models";
import SiteShell from "@/components/ui/site-shell";
import ResourceState from "@/components/ui/resource-state";
import Pagination from "@/components/ui/pagination";
import ClaimForm from "./claim-form";
import styles from "@/components/ui/report.module.css";

export default function ClaimManager({ itemId = "" }: { itemId?: string }) {
  const [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const params = new URLSearchParams({ page: String(page), status });
  if (itemId) params.set("itemId", itemId);
  const claims = useResource<Claim[]>(`/api/claims?${params}`);
  async function action(
    claim: Claim,
    decision: "APPROVED" | "REJECTED" | "DELETE",
  ) {
    const actionName =
      decision === "DELETE"
        ? "Delete"
        : decision === "APPROVED"
          ? "Approve"
          : "Reject";
    if (
      busy ||
      !window.confirm(
        `${actionName} the claim from ${claim.claimantName}? ${decision === "DELETE" ? "This cannot be undone." : "This decision is final."}`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await requestApi(
        `/api/claims/${claim._id}`,
        decision === "DELETE"
          ? { method: "DELETE" }
          : {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                itemId: claim.itemId,
                claimantName: claim.claimantName,
                contactInformation: claim.contactInformation,
                description: claim.description,
                status: decision,
              }),
            },
      );
      setMessage(
        decision === "APPROVED"
          ? "Claim approved. Open the item to mark it CLAIMED, then RETURNED after handover."
          : decision === "REJECTED"
            ? "Claim rejected."
            : "Claim deleted.",
      );
      setPage(1);
      claims.refresh();
      if (editing?._id === claim._id) setEditing(null);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SiteShell
      title="Ownership claims"
      description="Review ownership evidence and help reported items reach the right person."
      active="claims"
    >
      <div className={styles.stack}>
        <p className={styles.note}>
          Team demo: this version has no sign-in or roles. Claim details and
          review actions are available to everyone using the app.
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {message && (
          <p role="status" className={styles.success}>
            {message}
          </p>
        )}
        <div className={styles.grid}>
          <ClaimForm
            key={editing?._id ?? itemId}
            itemId={editing?.itemId ?? itemId}
            initial={editing ?? undefined}
            onSaved={() => {
              setMessage(
                editing ? "Claim updated." : "Claim submitted for review.",
              );
              setError("");
              setEditing(null);
              setPage(1);
              claims.refresh();
            }}
            onCancel={editing ? () => setEditing(null) : undefined}
          />
          <section className={styles.panel}>
            <div className={styles.heading}>
              <h2>{itemId ? "Claims for this item" : "All claims"}</h2>
              <button className={styles.secondary} onClick={claims.refresh}>
                Refresh claims
              </button>
            </div>
            {itemId && (
              <div className={styles.actions}>
                <Link href="/claims" className={styles.secondary}>
                  Show all claims
                </Link>
                <Link href={`/items/${itemId}`} className={styles.secondary}>
                  View item
                </Link>
              </div>
            )}
            <div className={styles.filters}>
              <label>
                Claim status
                <select
                  aria-label="Claim status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  {CLAIM_STATUSES.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            <ResourceState
              loading={claims.loading}
              error={claims.error}
              retry={claims.refresh}
            />
            {claims.data?.length === 0 && (
              <div className={styles.empty}>
                <h3>No claims found</h3>
                <p>
                  Submit a claim from an item’s detail page or try another
                  status.
                </p>
              </div>
            )}
            {claims.data && (
              <ul className={styles.list}>
                {claims.data.map((claim) => (
                  <li key={claim._id} className={styles.card}>
                    <span className={styles.badge}>{claim.status}</span>
                    <h3>{claim.claimantName}</h3>
                    <p className={styles.meta}>
                      Item:{" "}
                      <Link href={`/items/${claim.itemId}`}>
                        {claim.item?.itemName ?? "Item unavailable"}
                      </Link>
                    </p>
                    <p className={styles.description}>{claim.description}</p>
                    <p className={styles.meta}>
                      Contact: {claim.contactInformation}
                    </p>
                    <div className={styles.actions}>
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() => {
                          setEditing(claim);
                          setError("");
                          setMessage("");
                        }}
                      >
                        Edit claim
                      </button>
                      {claim.status === "PENDING" && (
                        <>
                          <button
                            className={styles.primary}
                            disabled={busy}
                            onClick={() => action(claim, "APPROVED")}
                          >
                            Approve
                          </button>
                          <button
                            className={styles.secondary}
                            disabled={busy}
                            onClick={() => action(claim, "REJECTED")}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        className={styles.danger}
                        disabled={busy}
                        onClick={() => action(claim, "DELETE")}
                      >
                        Delete claim
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Pagination info={claims.pagination} change={setPage} />
          </section>
        </div>
      </div>
    </SiteShell>
  );
}
