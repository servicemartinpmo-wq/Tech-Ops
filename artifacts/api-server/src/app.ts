import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import {
  securityHeaders,
  rateLimiter,
  sanitizeBody,
  globalErrorHandler,
} from "./middleware/security";

const app: Express = express();

app.set("trust proxy", 1);

app.use(securityHeaders);


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
