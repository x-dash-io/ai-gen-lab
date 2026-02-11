type PayPalAccessTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type PayPalOrderResponse = {
  id: string;
  links: Array<{ rel: string; href: string; method: string }>;
};

type PayPalWebhookVerificationResponse = {
  verification_status: "SUCCESS" | "FAILURE";
};

const paypalEnv = process.env.PAYPAL_ENV ?? "sandbox";
const paypalBaseUrl =
  paypalEnv === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const paypalClientId = process.env.PAYPAL_CLIENT_ID;
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;

function validatePayPalCredentials() {
  if (!paypalClientId || !paypalClientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET.");
  }
}

async function getPayPalAccessToken() {
  validatePayPalCredentials();
  
  const auth = Buffer.from(
    `${paypalClientId}:${paypalClientSecret}`,
    "utf-8"
  ).toString("base64");

  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token.");
  }

  const data = (await response.json()) as PayPalAccessTokenResponse;
  return data.access_token;
}

export async function createPayPalOrder({
  amountCents,
  currency,
  returnUrl,
  cancelUrl,
  purchaseId,
}: {
  amountCents: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
  purchaseId: string;
}) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency.toUpperCase(),
            value: (amountCents / 100).toFixed(2),
          },
          custom_id: purchaseId,
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create PayPal order.");
  }

  const data = (await response.json()) as PayPalOrderResponse;
  const approvalUrl = data.links.find((link) => link.rel === "approve")?.href;

  if (!approvalUrl) {
    throw new Error("Missing PayPal approval URL.");
  }

  return { orderId: data.id, approvalUrl };
}

export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to capture PayPal order.");
  }

  return response.json();
}

export async function revisePayPalSubscription({
  subscriptionId,
  planId,
  returnUrl,
  cancelUrl,
}: {
  subscriptionId: string;
  planId: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}/revise`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_action: "SUBSCRIBE_NOW",
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("PayPal Revise Subscription Error:", error);
    
    // Improved error throwing: Pass the specific issue code
    const errorMessage = error.details?.[0]?.issue || error.message || "Failed to revise PayPal subscription";
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as {
    id: string;
    links?: Array<{ rel?: string; href?: string }>;
  };
  const approvalUrl = data.links?.find((link: NonNullable<typeof data.links>[number]) => link.rel === "approve")?.href;

  return { subscriptionId: data.id, approvalUrl };
}

export async function createPayPalSubscription({
  planId,
  customId,
  returnUrl,
  cancelUrl,
}: {
  planId: string;
  customId: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: customId,
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("PayPal Create Subscription Error:", error);
    throw new Error("Failed to create PayPal subscription.");
  }

  const data = (await response.json()) as {
    id: string;
    links: Array<{ rel?: string; href?: string }>;
  };
  const approvalUrl = data.links.find((link: (typeof data.links)[number]) => link.rel === "approve")?.href;

  if (!approvalUrl) {
    throw new Error("Missing PayPal approval URL for subscription.");
  }

  return { subscriptionId: data.id, approvalUrl };
}

export async function verifyPayPalWebhook({
  transmissionId,
  transmissionTime,
  transmissionSig,
  certUrl,
  authAlgo,
  webhookEvent,
}: {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
  webhookEvent: unknown;
}) {
  if (!paypalWebhookId) {
    throw new Error("Missing PAYPAL_WEBHOOK_ID.");
  }

  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${paypalBaseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: paypalWebhookId,
        webhook_event: webhookEvent,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to verify PayPal webhook signature.");
  }

  const data = (await response.json()) as PayPalWebhookVerificationResponse;
  return data.verification_status === "SUCCESS";
}

export async function createPayPalProduct({
  name,
  description,
  type = "DIGITAL",
  category = "SOFTWARE",
}: {
  name: string;
  description?: string;
  type?: string;
  category?: string;
}) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${paypalBaseUrl}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `prod_${Date.now()}`,
    },
    body: JSON.stringify({
      name,
      description,
      type,
      category,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("PayPal Create Product Error:", error);
    throw new Error("Failed to create PayPal product.");
  }

  return response.json();
}

export async function createPayPalPlan({
  productId,
  name,
  description,
  priceCents,
  intervalCount = 1,
  intervalUnit = "MONTH",
}: {
  productId: string;
  name: string;
  description?: string;
  priceCents: number;
  intervalCount?: number;
  intervalUnit?: "MONTH" | "YEAR";
}) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${paypalBaseUrl}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `plan_${Date.now()}`,
    },
    body: JSON.stringify({
      product_id: productId,
      name,
      description,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: intervalUnit,
            interval_count: intervalCount,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // Infinite
          pricing_scheme: {
            fixed_price: {
              value: (priceCents / 100).toFixed(2),
              currency_code: "USD",
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: "0",
          currency_code: "USD",
        },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("PayPal Create Plan Error:", error);
    throw new Error("Failed to create PayPal plan.");
  }

  return response.json();
}

export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason: string = "User requested cancellation"
) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    }
  );

  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    console.error("PayPal Cancel Subscription Error:", error);
    throw new Error("Failed to cancel PayPal subscription.");
  }

  return true;
}

export async function getPayPalSubscription(subscriptionId: string) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch PayPal subscription.");
  }

  return response.json();
}
