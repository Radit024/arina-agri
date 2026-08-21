export class FetchError extends Error {
  info: unknown;
  status: number;

  constructor(message: string, info: unknown, status: number) {
    super(message);
    this.name = 'FetchError';
    this.info = info;
    this.status = status;
  }
}

export async function swrFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    let errorInfo: unknown;
    try {
      errorInfo = await res.json();
    } catch {
      errorInfo = await res.text();
    }

    throw new FetchError(
      `An error occurred while fetching the data (${res.status}).`,
      errorInfo,
      res.status
    );
  }

  return res.json() as Promise<T>;
}
