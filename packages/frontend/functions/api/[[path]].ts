const API_ORIGIN = "https://splisona-api.demo-user01.workers.dev";

export const onRequest: PagesFunction = async (context) => {
  const { request, params } = context;
  const path = Array.isArray(params.path) ? params.path.join("/") : params.path ?? "";
  const url = new URL(request.url);

  if (path === "_debug") {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    const email = request.headers.get("Cf-Access-Authenticated-User-Email");
    return Response.json({
      hasJwt: !!jwt,
      jwtLength: jwt?.length ?? 0,
      email,
      headers: Object.fromEntries([...request.headers.entries()].filter(([k]) => k.startsWith("cf-") || k.startsWith("cookie"))),
    });
  }

  const targetUrl = `${API_ORIGIN}/${path}${url.search}`;

  const headers = new Headers();
  headers.set("Content-Type", request.headers.get("Content-Type") ?? "application/json");

  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (jwt) {
    headers.set("X-Access-Jwt", jwt);
  }

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
  });

  return fetch(proxyRequest);
};
