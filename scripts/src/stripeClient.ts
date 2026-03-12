import Stripe from "stripe";

async function getStripeCredentials() {
  const connectionsUrl = `https://${process.env.REPLIT_DEV_DOMAIN}/__replit/connectors/stripe/credentials`;
  const response = await fetch(connectionsUrl, {
    headers: { "X-Replit-Proxied": "true" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${response.statusText}`);
  }
  const data = await response.json();
  return data as { stripeSecretKey: string; stripePublishableKey: string; stripeWebhookSecret: string };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const credentials = await getStripeCredentials();
  return new Stripe(credentials.stripeSecretKey, { apiVersion: "2025-04-30.basil" as any });
}
