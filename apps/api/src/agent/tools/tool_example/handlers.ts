export async function handleToolExample(
  input: Record<string, unknown>
): Promise<string> {
  const message = typeof input.message === "string" ? input.message : "";
  return JSON.stringify({
    ok: true,
    echo: message,
    receivedAt: new Date().toISOString(),
  });
}
