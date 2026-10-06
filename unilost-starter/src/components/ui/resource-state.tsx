import styles from "./report.module.css";
export default function ResourceState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (loading)
    return (
      <p role="status" className={styles.empty}>
        Loading…
      </p>
    );
  if (!error) return null;
  return (
    <div className={styles.error}>
      <p role="alert">{error}</p>
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={retry}>
          Try again
        </button>
      </div>
    </div>
  );
}
