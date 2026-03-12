import type { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
