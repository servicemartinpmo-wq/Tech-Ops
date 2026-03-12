import { Router, type IRouter } from "express";
import { storage } from "../storage";
import { stripeService } from "../stripeService";

const router: IRouter = Router();

router.get("/stripe/subscription", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await storage.getUser(req.user.id);
  if (!user?.stripeSubscriptionId) {
    res.json({ subscription: null, tier: user?.subscriptionTier || "free" });
    return;
  }

  const subscription = await storage.getSubscription(user.stripeSubscriptionId);
  res.json({ subscription, tier: user?.subscriptionTier || "free" });
});

router.post("/stripe/checkout", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await storage.getUser(req.user.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { priceId } = req.body;

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripeService.createCustomer(user.email || "", user.id);
    await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
    customerId = customer.id;
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const session = await stripeService.createCheckoutSession(
    customerId,
    priceId,
    `${baseUrl}/checkout/success`,
    `${baseUrl}/checkout/cancel`
  );

  res.json({ url: session.url });
});

router.get("/stripe/products", async (_req, res): Promise<void> => {
  const rows = await storage.listProductsWithPrices();

  const productsMap = new Map();
  for (const row of rows as any[]) {
    if (!productsMap.has(row.product_id)) {
      productsMap.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        description: row.product_description,
        metadata: row.product_metadata,
        prices: [],
      });
    }
    if (row.price_id) {
      productsMap.get(row.product_id).prices.push({
        id: row.price_id,
        unitAmount: row.unit_amount,
        currency: row.currency,
        recurring: row.recurring,
        active: row.price_active,
      });
    }
  }

  res.json({ data: Array.from(productsMap.values()) });
});

router.post("/stripe/portal", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await storage.getUser(req.user.id);
  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: "No billing account" });
    return;
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const session = await stripeService.createCustomerPortalSession(
    user.stripeCustomerId,
    `${baseUrl}/billing`
  );

  res.json({ url: session.url });
});

export default router;
