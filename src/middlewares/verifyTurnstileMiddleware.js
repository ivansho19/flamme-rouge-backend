const verifyTurnstileToken = async (token) => {
    if (!token) return false;
    
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.warn("TURNSTILE_SECRET_KEY no configurado. Permitiendo registro por defecto.");
      return true; 
    }
  
    try {
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token
        })
      });
  
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error("Error al validar Turnstile:", error);
      return false;
    }
  };

  export default verifyTurnstileToken;