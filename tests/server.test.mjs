import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { server } from "../server.js";

let base;
before(() => new Promise((resolve) => server.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); })));
after(() => new Promise((resolve) => server.close(resolve)));

test("de pagina en de assets worden geserveerd", async () => {
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(await page.text(), /De Gouden Kurk/);
  assert.equal((await fetch(`${base}/assets/js/app.js`)).status, 200);
  assert.equal((await fetch(`${base}/assets/products/campari.webp`)).headers.get("content-type"), "image/webp");
});

test("projectbestanden en paden buiten de map blijven dicht", async () => {
  for (const path of ["/tests/catalog.test.mjs", "/tools/check.mjs", "/package.json", "/.gitignore", "/%2e%2e/%2e%2e/etc/passwd"]) {
    assert.equal((await fetch(`${base}${path}`)).status, 404, path);
  }
});

test("alleen GET en HEAD", async () => {
  const res = await fetch(`${base}/`, { method: "POST" });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("allow"), "GET, HEAD");
});
