export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname === "/api/order" &&
      request.method === "POST"
    ) {
      return handleOrderRequest(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse(
        {
          success: false,
          error: "API route not found.",
        },
        404
      );
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleOrderRequest(request, env) {
  try {
    if (
      !env.ORDER_WEB_APP_URL ||
      !env.ORDER_API_SECRET
    ) {
      throw new Error(
        "The order service has not been configured."
      );
    }

    const contentType =
      request.headers.get("content-type") || "";

    if (
      !contentType
        .toLowerCase()
        .includes("application/json")
    ) {
      return jsonResponse(
        {
          success: false,
          error: "The request must contain JSON.",
        },
        415
      );
    }

    const order = await request.json();

    const response = await fetch(
      env.ORDER_WEB_APP_URL,
      {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: env.ORDER_API_SECRET,
          order,
        }),
      }
    );

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        "The order service returned an invalid response."
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ||
          "The order request could not be submitted."
      );
    }

    return jsonResponse({
      success: true,
      orderId: result.orderId,
      message: result.message,
    });
  } catch (error) {
    console.error("Order request error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error.message ||
          "The order request could not be submitted.",
      },
      500
    );
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(
    JSON.stringify(payload),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}