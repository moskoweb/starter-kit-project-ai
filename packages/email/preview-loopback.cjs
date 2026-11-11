const http = require("node:http");
const https = require("node:https");

// CLI 6.11.11 has no --hostname option and calls server.listen(port).
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (port, ...args) {
  if (typeof port !== "number" && typeof port !== "string") throw new Error("Unsupported preview listener");
  return listen.call(this, port, "127.0.0.1", ...args.filter((arg) => typeof arg === "function"));
};

function localUrl(value) {
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Email preview cannot make external requests or send email");
  }
}
const fetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  localUrl(typeof input === "string" || input instanceof URL ? input : input.url);
  return fetch(input, init);
};
for (const client of [http, https]) {
  const request = client.request;
  client.request = function (input, ...args) {
    if (typeof input === "string" || input instanceof URL) localUrl(input);
    else localUrl(`${input.protocol || (client === https ? "https:" : "http:")}//${input.hostname || input.host || "localhost"}`);
    return request.call(this, input, ...args);
  };
}
