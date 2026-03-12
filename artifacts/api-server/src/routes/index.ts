import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import stripeRouter from "./stripe";
import casesRouter from "./cases";
import dashboardRouter from "./dashboard";
import connectorsRouter from "./connectors";
import automationRouter from "./automation";
import preferencesRouter from "./preferences";
import openaiRouter from "./openai";
import batchesRouter from "./batches";
import alertsRouter from "./alerts";
import kbRouter from "./kb";
import vaultRouter from "./vault";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(stripeRouter);
router.use(casesRouter);
router.use(dashboardRouter);
router.use(connectorsRouter);
router.use(automationRouter);
router.use(preferencesRouter);
router.use(openaiRouter);
router.use(batchesRouter);
router.use(alertsRouter);
router.use(kbRouter);
router.use(vaultRouter);

export default router;
