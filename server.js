import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
const headers = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cross-Origin-Opener-Policy": "same-origin" };

export const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD", ...headers }).end(); return; }
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = normalize(join(root, path.endsWith("/") ? path + "index.html" : path));
  const allowed = file.startsWith(root) && !file.slice(root.length).split(sep).some((part) => part.startsWith(".") || ["node_modules", "tests", "tools"].includes(part));
  if (!allowed || !types[extname(file)]) { res.writeHead(404, headers).end("Niet gevonden"); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)], ...headers });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404, headers).end("Niet gevonden");
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(port, "127.0.0.1", () => console.log(`De Gouden Kurk: http://127.0.0.1:${port}`));
