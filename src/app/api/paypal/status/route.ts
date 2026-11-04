import { NextResponse } from "next/server";
import { getPaypalMode, getPaypalCurrency } from "@/lib/paypal";
import { pricingCanonPublic } from "@/lib/engines/offer-verify";

export const dynamic = "force-dynamic";

/**
 * GET /api/paypal/status — integration status for the header indicator.
 * Reports which PayPal environment the Checkout Truth Engine is talking
 * to (LIVE / SANDBOX / SIMULATION) without ever leaking the secret.
 * SIMULATION means PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not yet
 * set in .env — every code path is identical; the moment credentials
 * land, orders go to the real PayPal API.
 */
export async function GET() {
  const mode = getPaypalMode();
  const configured = mode !== "SIMULATION";
  return NextResponse.json({
    mode,
    configured,
    currency: getPaypalCurrency(),
    api: "Orders API v2 (OAuth2 client credentials)",
    capabilities: [
      "OAuth2 access-token management (module-cached until expiry)",
      "POST /v2/checkout/orders — canonical charge verification",
      "POST /v2/checkout/orders/{id}/capture — settlement evidence",
    ],
    pricingCanon: pricingCanonPublic(),
    setupHint: configured
      ? null
      : "Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env to switch from deterministic simulation to the live PayPal sandbox. No code changes required.",
  });
}
