import { test } from "node:test";
import assert from "node:assert/strict";
import { products, categories } from "../assets/js/products.js";
import {
  selectProducts, countByCategory, addToCart, setQuantity, sanitiseCart, cartLines, cartCount, cartTotal,
  formatPrice, isRozenburgPostcode, isDutchPhone, MAX_PER_BOTTLE
} from "../assets/js/catalog.js";

test("elk product heeft een unieke id en een bekende categorie", () => {
  const ids = products.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  const known = new Set(categories.map((c) => c.id));
  for (const p of products) assert.ok(known.has(p.category), p.id);
});

test("precies drie flessen staan uit de kast", () => {
  assert.equal(products.filter((p) => p.featured).length, 3);
});

test("sorteren is deterministisch en klopt per optie", () => {
  const byName = selectProducts(products, { sort: "naam" }).map((p) => p.name);
  assert.deepEqual(byName, [...byName].sort((a, b) => a.localeCompare(b, "nl-NL", { sensitivity: "base" })));
  const up = selectProducts(products, { sort: "prijs-op" }).map((p) => p.price);
  assert.deepEqual(up, [...up].sort((a, b) => a - b));
  const down = selectProducts(products, { sort: "prijs-af" }).map((p) => p.price);
  assert.deepEqual(down, [...down].sort((a, b) => b - a));
  assert.deepEqual(selectProducts(products, { sort: "prijs-op" }), selectProducts([...products].reverse(), { sort: "prijs-op" }));
});

test("filteren op soort en zoeken zonder accenten of hoofdletters", () => {
  assert.ok(selectProducts(products, { category: "whisky" }).every((p) => p.category === "whisky"));
  assert.deepEqual(selectProducts(products, { query: "HENNESSY" }).map((p) => p.id), ["hennessy-vs"]);
  assert.deepEqual(selectProducts(products, { query: "london dry" }).map((p) => p.id).sort(), ["beefeater-london-dry", "gordons-london-dry"]);
  assert.equal(selectProducts(products, { query: "bestaat niet" }).length, 0);
  assert.equal(selectProducts(products, { query: "liqueur", category: "gin" }).length, 0);
});

test("de tellingen per soort tellen op tot het geheel", () => {
  const counts = countByCategory(products, categories);
  const sum = categories.filter((c) => c.id !== "alles").reduce((s, c) => s + counts[c.id], 0);
  assert.equal(counts.alles, products.length);
  assert.equal(sum, products.length);
});

test("de mand begrenst aantallen en rekent in centen", () => {
  let cart = addToCart({}, "campari");
  cart = addToCart(cart, "campari", 2);
  assert.equal(cart.campari, 3);
  cart = addToCart(cart, "campari", 50);
  assert.equal(cart.campari, MAX_PER_BOTTLE);
  cart = setQuantity(cart, "campari", 0);
  assert.deepEqual(cart, {});
  cart = setQuantity(setQuantity({}, "campari", 3), "hennessy-vs", 1);
  const campari = products.find((p) => p.id === "campari").price;
  const hennessy = products.find((p) => p.id === "hennessy-vs").price;
  assert.equal(cartCount(cart), 4);
  assert.equal(cartTotal(cart, products), Math.round((campari * 3 + hennessy) * 100) / 100);
  assert.equal(cartLines(cart, products).length, 2);
});

test("een gemanipuleerde opgeslagen mand wordt opgeschoond", () => {
  assert.deepEqual(sanitiseCart({ campari: "2", onbekend: 3, "hennessy-vs": -4, "jb-rare": 999 }, products), { campari: 2, "jb-rare": MAX_PER_BOTTLE });
  assert.deepEqual(sanitiseCart(["campari"], products), {});
  assert.deepEqual(sanitiseCart(null, products), {});
});

test("prijzen staan in Nederlandse notatie", () => {
  assert.equal(formatPrice(24.99), "€ 24,99");
  assert.equal(formatPrice(1234.5), "€ 1.234,50");
});

test("bezorgen alleen binnen Rozenburg, telefoon alleen Nederlands", () => {
  for (const ok of ["3181 CG", "3181cg", " 3181 ab "]) assert.ok(isRozenburgPostcode(ok), ok);
  for (const bad of ["3011 AB", "3181", "3181 C", "31810 CG"]) assert.ok(!isRozenburgPostcode(bad), bad);
  for (const ok of ["06 44999844", "0644999844", "+31 6 44999844", "010-1234567"]) assert.ok(isDutchPhone(ok), ok);
  for (const bad of ["12345", "06 4499", "+44 20 7946 0958"]) assert.ok(!isDutchPhone(bad), bad);
});
