const getPayPalBaseUrl = () => {
  const env = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
};

const getPayPalAuthHeader = () => {
  const env = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
  
  let clientId, clientSecret;

  if (env === "live") {
    clientId = process.env.PAYPAL_LIVE_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    clientSecret = process.env.PAYPAL_LIVE_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
  } else {
    // Si no está en live, asume sandbox
    clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
  }

  if (!clientId || !clientSecret) {
    throw new Error(`Faltan las credenciales de PayPal para el entorno: ${env}`);
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${credentials}`;
};

const getAccessToken = async () => {
  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: getPayPalAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ grant_type: "client_credentials" })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error_description || data?.message || "PayPal auth failed";
    throw new Error(message);
  }

  return data.access_token;
};

export const createPayPalOrder = async ({ total, currency }) => {
  const accessToken = await getAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const value = Number(total).toFixed(2);

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value
          }
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || "PayPal create order failed";
    throw new Error(message);
  }

  return data;
};

export const capturePayPalOrder = async (orderId) => {
  const accessToken = await getAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || "PayPal capture order failed";
    throw new Error(message);
  }

  return data;
};
