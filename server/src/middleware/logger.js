// Simple request logger middleware (no external dependencies)
export default function logger(req, res, next) {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;

  // Capture the response finish event
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level} ${method} ${url} ${status} ${duration}ms`);
  });

  next();
}
