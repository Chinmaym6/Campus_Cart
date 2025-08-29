export function requestLogger(req, _res, next) {
  req._startAt = Date.now();
  next();
}
