import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "module";
import { createServer as createViteServer } from "vite";

const require = createRequire(import.meta.url);
const { app } = require("./app");

const PORT = 3000;

async function start() {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
      watch: null,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path === "/health") {
      next();
      return;
    }

    try {
      const indexPath = path.join(process.cwd(), "index.html");
      const template = await fs.readFile(indexPath, "utf-8");
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      next(error);
    }
  });

  app.listen(PORT, () => {
    console.log(`App running at http://localhost:${PORT}`);
  });
}

start();
