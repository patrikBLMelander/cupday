/** RTK Query error shape for our RFC-7807 responses. */
export interface ApiProblem {
  status?: number;
  data?: { title?: string; detail?: string; teamName?: string };
}

export function asProblem(error: unknown): ApiProblem {
  return (error ?? {}) as ApiProblem;
}
