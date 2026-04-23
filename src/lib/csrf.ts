/**
 * Same-origin guard for mutation API routes.
 *
 * Browser will always send an Origin (fetch/XHR) or Referer header. An
 * attacker site trying to CSRF us via <form> POST to a JSON endpoint will
 * send its OWN origin — which we compare against `host` and reject.
 *
 * Safe methods (GET/HEAD/OPTIONS) are ignored.
 * Same-origin requests always pass.
 * Missing Origin + matching Referer passes (native forms).
 * Missing BOTH is rejected.
 */

export function isSameOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const host = req.headers.get("host");
  if (!host) return false;

  // Normalise: scheme-agnostic host compare, trimming default ports.
  const normHost = host.toLowerCase().replace(/:80$|:443$/, "");

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase().replace(/:80$|:443$/, "");
      return originHost === normHost;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase().replace(/:80$|:443$/, "");
      return refererHost === normHost;
    } catch {
      return false;
    }
  }

  // Neither Origin nor Referer — legitimate browser fetches include at
  // least one for cross-origin mutations, so rejecting is the safe bet.
  return false;
}

import { NextResponse } from "next/server";

export function csrfGate(req: Request): NextResponse | null {
  if (isSameOrigin(req)) return null;
  return NextResponse.json(
    { error: "Cross-origin requests are not allowed" },
    { status: 403 },
  );
}
