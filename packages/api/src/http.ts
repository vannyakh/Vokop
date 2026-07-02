import type { ZodTypeAny, z } from 'zod';
import { apiErrorSchema } from './schemas/common.js';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function parseJson<T extends ZodTypeAny>(
  schema: T,
  res: Response,
): Promise<z.infer<T>> {
  const data: unknown = await res.json();
  return schema.parse(data);
}

export async function handleResponse<T extends ZodTypeAny>(
  schema: T,
  res: Response,
  fallbackMessage: string,
): Promise<z.infer<T>> {
  if (res.ok) return parseJson(schema, res);

  const errBody = await res.json().catch(() => ({}));
  const parsed = apiErrorSchema.safeParse(errBody);
  throw new ApiRequestError(
    parsed.success ? parsed.data.error : fallbackMessage,
    res.status,
    errBody,
  );
}
