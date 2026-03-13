import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { WebhookHandlers } from "./webhookHandlers";
import {
  securityHeaders,
  rateLimiter,
  sanitizeBody,
  globalErrorHandler,
} from "./middleware/security";

const app: Express = express();

app.set("trust proxy", 1);

app.use(securityHeaders);

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature' });
      return;
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer.');
        res.status(500).json({ error: 'Webhook processing error' });
        return;
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown webhook error";
      console.error('Webhook error:', message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);
app.use(authMiddleware);
app.use(rateLimiter);

app.use("/api", router);

app.use(globalErrorHandler);

export default app;
