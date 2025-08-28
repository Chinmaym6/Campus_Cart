// zod-based body/query validator
import { z } from "zod";

export const validate =
  (schema) =>
  (req, res, next) => {
    try {
      const data = {
        body: req.body,
        query: req.query,
        params: req.params
      };
      const parsed = schema.parse(data);
      // merge sanitized data back
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;
      next();
    } catch (err) {
      const issues = err?.issues?.map(i => ({ path: i.path.join("."), message: i.message })) ?? [];
      return res.status(400).json({ message: "Validation failed", issues });
    }
  };

export const zod = z;
