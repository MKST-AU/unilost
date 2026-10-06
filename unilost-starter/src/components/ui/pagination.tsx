import type { PageInfo } from "@/types/models";
import styles from "./report.module.css";
export default function Pagination({
  info,
  change,
}: {
  info?: PageInfo;
  change: (page: number) => void;
}) {
  if (!info || info.pages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Results pages">
      <button
        className={styles.secondary}
        disabled={info.page <= 1}
        onClick={() => change(info.page - 1)}
      >
        Previous
      </button>
      <span>
        Page {info.page} of {info.pages} · {info.total} results
      </span>
      <button
        className={styles.secondary}
        disabled={info.page >= info.pages}
        onClick={() => change(info.page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
