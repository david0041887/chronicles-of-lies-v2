import type { NextConfig } from "next";

/**
 * Security headers applied to every response. Values err on the side of
 * tight — loosen only as needed for a specific feature, and document why.
 */
const securityHeaders: { key: string; value: string }[] = [
  // Block iframe embedding (clickjacking mitigation).
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full URL as referer to third-party sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny all sensors/features we don't use.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), gyroscope=(), " +
      "accelerometer=(), interest-cohort=(), payment=(), usb=()",
  },
  // Force HTTPS for 180 days (Railway already HTTPS). includeSubDomains
  // is intentionally omitted until you're sure no plain-HTTP subdomains
  // exist.
  {
    key: "Strict-Transport-Security",
    value: "max-age=15552000",
  },
  // Content-Security-Policy.
  // - 'unsafe-inline' on style-src is required by Tailwind v4 + framer-motion
  //   (both inject inline style attributes).
  // - 'unsafe-eval' is needed by Next 16 dev mode; we keep it in prod for now
  //   until we verify nothing else depends on it.
  // - img-src allows data:/blob: for <img> rendering of CardImage bytes.
  // - connect-src is 'self' only — no third-party analytics yet.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
