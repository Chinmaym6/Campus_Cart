export function errorHandler(err, req, res, _next) {
  // Log once with full details so we can see 500 root cause
  console.error("Error:", err.stack || err);

  // Zod → 400
  if (err?.issues && Array.isArray(err.issues)) {
    return res.status(400).json({
      error: "Validation error",
      details: err.issues.map(i => ({
        path: i.path?.join("."),
        message: i.message
      }))
    });
  }

  const status = err.status || 500;
  const message = err.message || "Server error";
  res.status(status).json({ error: message });
}
