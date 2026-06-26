import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { listPersonas, createPersona, getPersona, deletePersona } from "./persona/handler.js";

const app = new Hono();

// API Gateway Lambda Proxy イベントへの変換アダプター
function toEvent(req: { header: (k: string) => string | undefined }, pathParams: Record<string, string> = {}, body?: string) {
  return {
    headers: Object.fromEntries(
      ["x-local-user-id", "content-type", "authorization"].map((k) => [k, req.header(k) ?? ""])
    ),
    pathParameters: pathParams,
    body: body ?? null,
    requestContext: {},
  };
}

// ローカル用モック認証ミドルウェア（x-local-user-id を信頼）
app.use("*", async (c, next) => {
  const userId = c.req.header("x-local-user-id");
  if (!userId) {
    return c.json({ error: "UNAUTHORIZED", message: "x-local-user-id header required in local mode" }, 401);
  }
  await next();
});

// Persona routes
app.get("/personas", async (c) => {
  const res = await listPersonas(toEvent(c.req));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.post("/personas", async (c) => {
  const body = await c.req.text();
  const res = await createPersona({ ...toEvent(c.req, {}, body), body });
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.get("/personas/:id", async (c) => {
  const res = await getPersona(toEvent(c.req, { id: c.req.param("id") }));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

app.delete("/personas/:id", async (c) => {
  const res = await deletePersona(toEvent(c.req, { id: c.req.param("id") }));
  return c.body(res.body, res.statusCode as 200, res.headers as Record<string, string>);
});

const port = Number(process.env.PORT ?? 3001);
console.log(`Chorus local dev server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
