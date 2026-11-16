import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const scriptPolicy = isDevelopment ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'";

// Só em desenvolvimento: permite um Supabase local (ex.: `supabase start` em http://127.0.0.1:54321).
// Em produção a política continua exatamente a mesma.
function devSupabaseOrigin() {
  if (!isDevelopment || !process.env.NEXT_PUBLIC_SUPABASE_URL) return "";
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (url.hostname.endsWith(".supabase.co")) return "";
    return ` ${url.origin} ${url.origin.replace(/^http/, "ws")}`;
  } catch { return ""; }
}
const extraConnect = devSupabaseOrigin();
const upgradeInsecure = extraConnect ? "" : "; upgrade-insecure-requests";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.stripe.com\")" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; ${scriptPolicy}; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com${extraConnect}; form-action 'self' https://checkout.stripe.com; frame-src https://checkout.stripe.com${upgradeInsecure}` },
      ],
    }];
  },
};

export default nextConfig;
