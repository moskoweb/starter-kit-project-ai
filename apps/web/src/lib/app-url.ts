const value = import.meta.env.PUBLIC_APP_URL || (import.meta.env.DEV ? "http://127.0.0.1:3000" : "");
let url: URL;
try {
  url = new URL(value);
  const localHttp = import.meta.env.DEV && url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
} catch {
  throw new Error("PUBLIC_APP_URL must be an absolute app origin; HTTPS is required outside loopback development.");
}
export const appUrl = url.origin;
