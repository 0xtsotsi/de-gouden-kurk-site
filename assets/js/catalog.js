const collator = new Intl.Collator("nl-NL", { sensitivity: "base" });
const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export const sortOptions = Object.freeze([
  { id: "naam", label: "Naam, A tot Z" },
  { id: "prijs-op", label: "Prijs, laag naar hoog" },
  { id: "prijs-af", label: "Prijs, hoog naar laag" }
]);

export const MAX_PER_BOTTLE = 12;

export function formatPrice(value) {
  return euro.format(value).replace(/\u00a0/g, " ");
}

function normalise(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function matches(product, query) {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = normalise([product.name, product.style, product.categoryLabel].join(" "));
  return words.every((word) => haystack.includes(word));
}

export function selectProducts(products, { query = "", category = "alles", sort = "naam" } = {}) {
  const chosen = products.filter((p) => (category === "alles" || p.category === category) && matches(p, query));
  const byName = (a, b) => collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
  const order = {
    naam: byName,
    "prijs-op": (a, b) => a.price - b.price || byName(a, b),
    "prijs-af": (a, b) => b.price - a.price || byName(a, b)
  }[sort] ?? byName;
  return [...chosen].sort(order);
}

export function countByCategory(products, categories) {
  return Object.fromEntries(categories.map((c) => [c.id, c.id === "alles" ? products.length : products.filter((p) => p.category === c.id).length]));
}

export function clampQuantity(value) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_PER_BOTTLE);
}

// The cart is a plain { id: quantity } map so it can round-trip through storage safely.
export function setQuantity(cart, id, quantity) {
  const next = { ...cart };
  const q = clampQuantity(quantity);
  if (q === 0) delete next[id];
  else next[id] = q;
  return next;
}

export function addToCart(cart, id, quantity = 1) {
  return setQuantity(cart, id, (cart[id] ?? 0) + quantity);
}

export function sanitiseCart(raw, products) {
  const known = new Set(products.map((p) => p.id));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  let cart = {};
  for (const [id, q] of Object.entries(raw)) if (known.has(id)) cart = setQuantity(cart, id, q);
  return cart;
}

export function cartLines(cart, products) {
  return products.filter((p) => cart[p.id]).map((p) => ({ product: p, quantity: cart[p.id], total: Math.round(p.price * cart[p.id] * 100) / 100 }));
}

export function cartCount(cart) {
  return Object.values(cart).reduce((sum, q) => sum + q, 0);
}

export function cartTotal(cart, products) {
  return Math.round(cartLines(cart, products).reduce((sum, line) => sum + line.total, 0) * 100) / 100;
}

export function isRozenburgPostcode(value) {
  return /^3181\s?[a-z]{2}$/i.test(value.trim());
}

export function isDutchPhone(value) {
  const digits = value.replace(/[\s().-]/g, "");
  return /^(\+31|0031|0)[1-9]\d{8}$/.test(digits);
}
