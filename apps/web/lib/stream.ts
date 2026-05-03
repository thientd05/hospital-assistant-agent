export async function* readSSEStream(
  response: Response
): AsyncGenerator<unknown, void, unknown> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data && data !== "[DONE]") {
            try {
              yield JSON.parse(data);
            } catch {
              // ignore malformed frame
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
