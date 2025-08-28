// light text moderation to block obvious abuse on public text fields
const BAD = [
  /(?:kill|murder|bomb)\b/i,
  /(?:nazi|kkk|terror)\b/i,
  /(?:sexually explicit|child porn)/i
];

export function contentGuard(fields = []) {
  return (req, res, next) => {
    try {
      const texts = fields
        .map((f) => req.body?.[f])
        .filter(Boolean)
        .map(String);
      for (const t of texts) {
        for (const rule of BAD) {
          if (rule.test(t)) {
            const e = new Error("Inappropriate content detected");
            e.status = 400;
            throw e;
          }
        }
      }
      next();
    } catch (e) {
      res.status(e.status || 400).json({ message: e.message || "Content rejected" });
    }
  };
}
