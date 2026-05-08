import crypto from "crypto";

const JUSPAY_BASE = {
  sandbox: "https://sandbox.juspay.in",
  production: "https://api.juspay.in",
};

function basicAuth(apiKey) {
  return "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
}

export async function createJuspayOrder({ merchantId, apiKey, environment = "sandbox", order }) {
  const base = JUSPAY_BASE[environment] || JUSPAY_BASE.sandbox;
  const body = new URLSearchParams({
    order_id: order.orderId,
    amount: order.amount.toFixed(2),
    customer_id: order.customerId,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone || "9999999999",
    product_id: merchantId,
    return_url: order.returnUrl,
    description: order.description || "Order payment",
    currency: "INR",
  });

  const resp = await fetch(`${base}/order/create`, {
    method: "POST",
    headers: {
      "Authorization": basicAuth(apiKey),
      "Content-Type": "application/x-www-form-urlencoded",
      "version": "2021-04-21",
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Juspay order creation failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

export async function getJuspayOrderStatus({ apiKey, environment = "sandbox", orderId }) {
  const base = JUSPAY_BASE[environment] || JUSPAY_BASE.sandbox;
  const resp = await fetch(`${base}/order/${orderId}`, {
    headers: {
      "Authorization": basicAuth(apiKey),
      "version": "2021-04-21",
    },
  });
  if (!resp.ok) throw new Error(`Juspay status check failed: ${resp.status}`);
  return resp.json();
}

export function verifyJuspayWebhook(payload, receivedSignature, secret) {
  const computed = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(receivedSignature));
}
