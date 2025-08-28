export const notFound = (req, res, next) => {
  res.status(404).json({ message: "Not Found" });
};
export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: err.message || "Internal Server Error" });
};
