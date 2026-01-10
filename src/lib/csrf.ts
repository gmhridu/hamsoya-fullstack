import { randomBytes } from "crypto";

// In-memory storage for CSRF tokens (for demonstration purposes)
// In a production environment, use a secure session store or Redis
const csrfTokens = new Map<string, string>();

export const generateCSRFToken = (): string => {
  const token = randomBytes(32).toString("hex");
  csrfTokens.set(token, token);
  return token;
};

export const validateCSRFToken = (token: string): boolean => {
  if (!token) return false;
  const storedToken = csrfTokens.get(token);
  if (!storedToken) return false;
  csrfTokens.delete(token); // Remove token after validation
  return true;
};

export const getCSRFToken = (): string => {
  const token = randomBytes(32).toString("hex");
  csrfTokens.set(token, token);
  return token;
};
