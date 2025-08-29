export const validate = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!parsed.success) {
    const err = new Error("Validation failed");
    err.status = 400;
    err.details = parsed.error.flatten();
    return next(err);
  }
  next();
};
