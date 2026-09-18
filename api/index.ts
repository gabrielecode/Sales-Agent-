import app from "../server";

export default function handler(req: any, res: any) {
  return new Promise((resolve) => {
    // If request URL was routed through Vercel dynamic params or rewrites
    if (req.query?.all) {
      const segments = Array.isArray(req.query.all) ? req.query.all : [req.query.all];
      req.url = "/api/" + segments.join("/");
    }

    res.once("finish", () => resolve(undefined));
    res.once("close", () => resolve(undefined));

    try {
      (app as any)(req, res, (err: any) => {
        if (err) {
          console.error("[Vercel API] Express error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: err.message || "Errore interno serverless" });
          }
        } else if (!res.headersSent) {
          res.status(404).json({ error: `Not found: ${req.method} ${req.url}` });
        }
        resolve(undefined);
      });
    } catch (uncaught: any) {
      console.error("[Vercel API] Uncaught handler error:", uncaught);
      if (!res.headersSent) {
        res.status(500).json({ error: uncaught?.message || "Errore non gestito" });
      }
      resolve(undefined);
    }
  });
}


