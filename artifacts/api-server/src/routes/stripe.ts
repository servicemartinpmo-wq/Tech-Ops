import { Router, type IRouter, type Response } from "express";
import { storage } from "../storage";
import { stripeService } from "../stripeService";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/stripe/subscription", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await storage.getUser(authReq.user.id);
  if (!user?.stripeSubscriptionId) {
    res.json({ subscription: null, tier: user?.subscriptionTier || "free" });
    return;
  }

  const subscription = await storage.getSubscription(user.stripeSubscriptionId);
  res.json({ subscription, tier: user?.subscriptionTier || "free" });
});

router.post("/stripe/checkout", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await storage.getUser(authReq.user.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { priceId } = req.body as { priceId: string };

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

router.get("/stripe/products", async (_req, res: Response): Promise<void> => {
  const rows = await storage.listProductsWithPrices();

  const productsMap = new Map<string, {
    id: string;
    name: string;
    description: string;
    metadata: unknown;
    prices: Array<{
      id: string;
      unitAmount: number;
      currency: string;
      recurring: unknown;
      active: boolean;
    }>;
  }>();

  for (const row of rows as Array<Record<string, unknown>>) {
    const productId = row.product_id as string;
    if (!productsMap.has(productId)) {
      productsMap.set(productId, {
        id: productId,
        name: row.product_name as string,
        description: row.product_description as string,
        metadata: row.product_metadata,
        prices: [],
      });
    }
    if (row.price_id) {
      productsMap.get(productId)!.prices.push({
        id: row.price_id as string,
        unitAmount: row.unit_amount as number,
        currency: row.currency as string,
        recurring: row.recurring,
        active: row.price_active as boolean,
      });
    }
  }

  res.json({ data: Array.from(productsMap.values()) });
});

router.post("/stripe/portal", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await storage.getUser(authReq.user.id);
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
