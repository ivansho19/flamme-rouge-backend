import geoip from "geoip-lite";

const normalizeIp = (ip = "") => {
  if (!ip) return "";
  return ip.replace(/^::ffff:/, "").trim();
};

export const getRequestIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === "string"
      ? forwarded.split(",")[0]
      : "";

  return normalizeIp(forwardedIp || req.ip || req.connection?.remoteAddress || "");
};

export const getRequestCountry = (req) => {
  const ip = getRequestIp(req);

  if (!ip || ip === "::1" || ip === "127.0.0.1") {
    return null;
  }

  const geo = geoip.lookup(ip);
  return geo?.country || null;
};

export const isCountryBlocked = (country, blockedCountries = []) => {
  if (!country || !Array.isArray(blockedCountries)) {
    return false;
  }

  const normalizedCountry = country.toUpperCase();
  return blockedCountries.some((code) => String(code).toUpperCase() === normalizedCountry);
};

export const isRequestBlocked = (req, blockedCountries = []) => {
  const country = getRequestCountry(req);
  return isCountryBlocked(country, blockedCountries);
};
