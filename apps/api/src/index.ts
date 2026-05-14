import { buildApp } from "./app.ts";

const { app, port } = await buildApp();
await app.listen({ port, host: "0.0.0.0" });
console.log(`API running on http://localhost:${port}`);
