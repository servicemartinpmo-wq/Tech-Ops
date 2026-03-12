import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

let stripeSyncInstance: StripeSync | null = null;
let cachedCredentials: { stripeSecretKey: string; stripeWebhookSecret: string } | null = null;

async function getStripeCredentials() {
  if (cachedCredentials) return cachedCredentials;

  const host = process.env.REPLIT_DEV_DOMAIN || "";
  const isDeployment = !!process.env.REPLIT_DEPLOYMENT_URL;
  const baseUrl = isDeployment ? process.env.REPLIT_DEPLOYMENT_URL : `https://${host}`;

  const urls = [
    `${baseUrl}/__replit/connectors/stripe/credentials`,
    `http://localhost:1106/__replit/connectors/stripe/credentials`,
  ];

  for (const url of urls) {
    try {
      const headers: Record<string, string> = {};
      if (!isDeployment && url.startsWith("https://")) {
        headers["X-Replit-Proxied"] = "true";
      }
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json() as Record<string, string>;
        const secretKey = data.stripeSecretKey || data.secret;
        if (!secretKey) {
          throw new Error("Stripe credentials response missing secret key");
        }
        cachedCredentials = {
          stripeSecretKey: secretKey,
          stripeWebhookSecret: data.stripeWebhookSecret || data.webhookSecret || "",
        };
        return cachedCredentials;
      }
    } catch {
      continue;
    }
  }

  if (process.env.STRIPE_SECRET_KEY) {
    cachedCredentials = {
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    };
    return cachedCredentials;
  }

  throw new Error("Could not fetch Stripe credentials from any source");
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const credentials = await getStripeCredentials();
  return new Stripe(credentials.stripeSecretKey);
}

export async function getStripeSync(): Promise<StripeSync> {
  if (stripeSyncInstance) return stripeSyncInstance;
  const credentials = await getStripeCredentials();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");
  stripeSyncInstance = new StripeSync({
    stripeSecretKey: credentials.stripeSecretKey,
    stripeWebhookSecret: credentials.stripeWebhookSecret,
    databaseUrl,
    poolConfig: {},
  });
  return stripeSyncInstance;
}
