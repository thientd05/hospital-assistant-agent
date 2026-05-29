import { buildAgentApp } from "./app.ts";

const { app, port } = await buildAgentApp();
await app.listen({ port, host: "0.0.0.0" });
console.log(`Agent running on http://localhost:${port}`);
