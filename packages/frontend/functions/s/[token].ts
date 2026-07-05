const API_ORIGIN = "https://splisona-api.demo-user01.workers.dev";

/**
 * 共有レポートページのプロキシ。
 * 共有 URL をアプリと同一ドメイン（splisona.pages.dev/s/<token>）にするための薄い転送で、
 * トークン検証・HTML 組み立ては Worker 側 (/share/:token) が行う。
 * 注意: このパスは CF Access のバイパスポリシー（/s）が前提。
 */
export const onRequestGet: PagesFunction = async (context) => {
  const token = Array.isArray(context.params.token)
    ? context.params.token[0]
    : context.params.token ?? "";

  if (!/^shr_[a-f0-9]{16,}$/.test(token)) {
    return new Response("リンクが無効です", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const res = await fetch(`${API_ORIGIN}/share/${token}`);
  // Worker 側のヘッダー（no-store / noindex / content-type）をそのまま透過
  return new Response(res.body, { status: res.status, headers: res.headers });
};
