const fs = require("fs");

const deepCompare = (obj1, obj2, visited = new WeakMap()) => {
  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 === "object" && obj1 !== null && obj2 !== null) {
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
    if (Array.isArray(obj1) && obj1.length !== obj2.length) return false;

    if (visited.get(obj1) && visited.get(obj2)) return true;
    visited.set(obj1, true);
    visited.set(obj2, true);

    const keys1 = Object.keys(obj1);
    for (const key of keys1) {
      if (!Object.prototype.hasOwnProperty.call(obj2, key) || !deepCompare(obj1[key], obj2[key], visited)) {
        return false;
      }
    }
    return true;
  } else {
    return obj1 === obj2;
  }
};

const loadConfig = (configPath) => {
  const rawData = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(rawData);
};

const clearUrl = (url) => url.split("?")[0];

const parseQueryString = (queryString) => {
  return queryString.split("&").reduce((acc, pair) => {
    const [key, val] = pair.split("=");
    acc[key] = val;
    return acc;
  }, {});
};

const validateData = (data) => {
  if (!data.port) throw new Error("Port is required");
};

const httpErrorResponse = (res) => {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
};

const httpResponse = (res, config) => {
    if (!config || !config.output) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error: No output configuration provided");
        return;
    }
    res.writeHead(200, config.output.headers || { "Content-Type": "text/plain" });
    res.end(config.output.response);
};

const validateAndCheckMethod = (methods) => {
  const allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];

  if (!methods) throw new Error("Method is required");
  if (typeof methods === "string") methods = [methods];

  const upperMethods = methods.map(m => m.toUpperCase());
  for (const m of upperMethods) {
    if (!allowedMethods.includes(m)) {
      throw new Error(`Invalid method '${m}'. Allowed methods are ${allowedMethods.join(", ")}`);
    }
  }

  return upperMethods;
};

module.exports = {
  deepCompare,
  loadConfig,
  clearUrl,
  parseQueryString,
  validateData,
  httpErrorResponse,
  httpResponse,
  validateAndCheckMethod
};
