import { ZodError } from "zod";

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.issues });
  }
  const status = err.status || 500;
  const message = err.message || "Something went wrong";
  res.status(status).json({ error: message });
}
