import rateLimit from "express-rate-limit";

export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 peticiones por IP en 15 minutos (suficiente para uso normal, previene scraping agresivo)
  message: {
    status: 429,
    message: "Demasiadas solicitudes desde esta IP, por favor intenta más tarde."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const postRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 peticiones POST por IP en 15 minutos
  message: {
    status: 429,
    message: "Demasiadas peticiones enviadas. Por favor, espera unos minutos antes de volver a intentarlo."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
