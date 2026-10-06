"use client";

import { useEffect, useState } from "react";
import type { PageInfo } from "@/types/models";
export type ApiResult<T> = { data: T; pagination?: PageInfo };
export async function requestApi<T>(
  url: string,
  options?: RequestInit,
): Promise<ApiResult<T>> {
  const response = await fetch(url, { cache: "no-store", ...options });
  let result: ApiResult<T> & { error?: string };
  try {
    result = await response.json();
  } catch {
    throw new Error(
      response.status === 404
        ? "This service is not available yet."
        : "Unable to read the server response. Please try again.",
    );
  }
  if (!response.ok)
    throw new Error(result.error ?? "Something went wrong. Please try again.");
  return result;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
export function useResource<T>(url: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    url: string | null;
    version: number;
    result?: ApiResult<T>;
    error: string;
  }>({ url: null, version: -1, error: "" });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    requestApi<T>(url, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted)
          setState({ url, version, result, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ url, version, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [url, version]);
  const current = state.url === url && state.version === version;
  return {
    data: current ? state.result?.data : undefined,
    pagination: current ? state.result?.pagination : undefined,
    error: current ? state.error : "",
    loading: Boolean(url) && !current,
    refresh: () => setVersion((value) => value + 1),
  };
}
