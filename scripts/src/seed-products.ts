import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY env var required");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const TIERS = [
  {
    name: "Individual",
    description: "Essential diagnostics for solo operators. Basic Apphia Engine access with core diagnostic pipeline.",
    amount: 900,
    metadata: { tier: "individual", maxCases: "10", maxBatchConcurrency: "1", features: "basic_diagnostics,single_connector" },
  },
  {
    name: "Professional",
    description: "Advanced diagnostics for growing teams. Full Apphia Engine with Tier 1-3 diagnostics and preferences customization.",
    amount: 2900,
    metadata: { tier: "professional", maxCases: "50", maxBatchConcurrency: "5", features: "advanced_diagnostics,multi_connector,preferences_quiz,batch_execution" },
  },
  {
    name: "Business",
    description: "Complete operations platform. Full diagnostic pipeline (Tier 1-5), automation center, and connector health monitoring.",
    amount: 7900,
    metadata: { tier: "business", maxCases: "200", maxBatchConcurrency: "20", features: "full_diagnostics,automation_center,connector_monitoring,batch_execution,priority_support" },
  },
  {
    name: "Enterprise",
    description: "Unlimited access with dedicated support. Full platform with custom integrations, unlimited cases, and SLA guarantees.",
    amount: 19900,
    metadata: { tier: "enterprise", maxCases: "unlimited", maxBatchConcurrency: "unlimited", features: "all_features,custom_integrations,dedicated_support,sla_guarantee" },
  },
];

async function createProducts() {
  console.log("Creating Tech-Ops subscription tiers in Stripe...");

  for (const tier of TIERS) {
    const existing = await stripe.products.search({
      query: `name:'${tier.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`  ${tier.name} already exists (${existing.data[0].id}). Skipping.`);
      continue;
    }

    const product = await stripe.products.create({
      name: tier.name,
      description: tier.description,
      metadata: tier.metadata,
    });
    console.log(`  Created product: ${product.name} (${product.id})`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.amount,
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log(`    Monthly price: $${(tier.amount / 100).toFixed(2)}/month (${price.id})`);
  }

  console.log("\nAll subscription tiers created successfully!");
}

createProducts().catch(console.error);
