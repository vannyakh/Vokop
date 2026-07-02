import type { z } from 'zod';

/** Validate outgoing JSON matches the shared API contract. */
export function toApiResponse<T extends z.ZodTypeAny>(
  schema: T,
  data: z.infer<T>,
): z.infer<T> {
  return schema.parse(data);
}
