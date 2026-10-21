export async function readJson(c) {
  try {
    const data = await c.req.json();
    return { ok: true, data };
  } catch {
    return { ok: false, data: null };
  }
}

export function parseWithSchema(schema, data) {
  const result = schema.safeParse(data);
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error };
}
