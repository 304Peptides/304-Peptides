import coreWorker from "./core.js";

const MAX_AUTH_REQUEST_LENGTH = 20_000;
const MAX_ACCOUNT_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const PASSWORD_HASH_ITERATIONS = 100_000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const ACCOUNT_KEY_PREFIX = "account:";
const SESSION_COOKIE_NAME = "__Host-304_session";

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth/change-password") {
      return handleChangePasswordRequest(request, env);
    }

    if (
      request.method === "POST" &&
      ["/api/auth/register", "/api/auth/login"].includes(
        url.pathname
      )
    ) {
      const response = await coreWorker.fetch(
        request,
        env,
        context
      );

      return upgradeAuthenticationResponse(
        response,
        env
      );
    }

    if (url.pathname === "/api/auth/session") {
      const sessionState =
        await inspectCustomerSession(
          request,
          env
        );

      if (
        sessionState.hasToken &&
        !sessionState.session
      ) {
        return jsonResponse(
          {
            success: true,
            authenticated: false,
            account: null,
          },
          200,
          {
            "Set-Cookie":
              buildClearedSessionCookie(),
          }
        );
      }
    }

    if (url.pathname === "/api/account/orders") {
      const sessionState =
        await inspectCustomerSession(
          request,
          env
        );

      if (!sessionState.session) {
        return jsonResponse(
          {
            success: false,
            error:
              "Customer authentication is required.",
          },
          401,
          {
            "Set-Cookie":
              buildClearedSessionCookie(),
          }
        );
      }
    }

    if (
      url.pathname === "/api/order" &&
      request.method === "POST"
    ) {
      const sessionState =
        await inspectCustomerSession(
          request,
          env
        );

      if (
        sessionState.hasToken &&
        !sessionState.session
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Your secure session has expired. Log in again before submitting the order.",
          },
          401,
          {
            "Set-Cookie":
              buildClearedSessionCookie(),
          }
        );
      }
    }

    return coreWorker.fetch(
      request,
      env,
      context
    );
  },
};

async function upgradeAuthenticationResponse(
  response,
  env
) {
  if (!response.ok) {
    return response;
  }

  let result;

  try {
    result = await response.clone().json();
  } catch {
    return response;
  }

  if (
    !result?.success ||
    !result?.authenticated ||
    !result?.account?.email ||
    !result?.account?.id
  ) {
    return response;
  }

  try {
    validateEnvironment(env);

    const accountKey = await getAccountKey(
      result.account.email
    );

    const storedAccount =
      await env.DOCUMENTS_KV.get(
        accountKey,
        "json"
      );

    const account =
      storedAccount || result.account;

    const sessionVersion =
      getAccountSessionVersion(account);

    if (
      storedAccount &&
      storedAccount.sessionVersion !==
        sessionVersion
    ) {
      await putAccountRecord(
        env,
        accountKey,
        {
          ...storedAccount,
          sessionVersion,
        }
      );
    }

    const token =
      await createCustomerSessionToken(
        {
          ...account,
          sessionVersion,
        },
        env
      );

    const headers = new Headers(
      response.headers
    );

    headers.set(
      "Set-Cookie",
      buildSessionCookie(token)
    );

    headers.set(
      "Cache-Control",
      "no-store"
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error(
      "Secure session upgrade failed:",
      error
    );

    return jsonResponse(
      {
        success: false,
        authenticated: false,
        error:
          "The account was accepted, but the secure session could not be finalized. Please log in again.",
      },
      503,
      {
        "Set-Cookie":
          buildClearedSessionCookie(),
      }
    );
  }
}

async function handleChangePasswordRequest(
  request,
  env
) {
  try {
    validateEnvironment(env);

    if (request.method !== "POST") {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(request);
    validateJsonContentType(request);

    await enforceAuthenticationRateLimit(
      request,
      env,
      "change-password"
    );

    const sessionState =
      await inspectCustomerSession(
        request,
        env
      );

    if (!sessionState.session) {
      throw new ApiRequestError(
        "Customer authentication is required.",
        401
      );
    }

    const body = await readJsonRequest(
      request,
      MAX_AUTH_REQUEST_LENGTH
    );

    const currentPassword = String(
      body.currentPassword == null
        ? ""
        : body.currentPassword
    );

    const newPassword =
      validateAccountPassword(
        body.newPassword
      );

    if (
      !currentPassword ||
      currentPassword.length >
        MAX_PASSWORD_LENGTH
    ) {
      throw new ApiRequestError(
        "The current password is incorrect.",
        401
      );
    }

    const account =
      sessionState.session.account;

    const passwordMatches =
      await verifyPassword(
        currentPassword,
        account
      );

    if (!passwordMatches) {
      throw new ApiRequestError(
        "The current password is incorrect.",
        401
      );
    }

    if (currentPassword === newPassword) {
      throw new ApiRequestError(
        "The new password must be different from the current password.",
        400
      );
    }

    const salt = randomBytes(16);

    const passwordHash =
      await derivePasswordHash(
        newPassword,
        salt
      );

    const now =
      new Date().toISOString();

    const updatedAccount = {
      ...account,

      passwordHash:
        bytesToBase64Url(passwordHash),

      passwordSalt:
        bytesToBase64Url(salt),

      passwordIterations:
        PASSWORD_HASH_ITERATIONS,

      passwordChangedAt:
        now,

      sessionVersion:
        getAccountSessionVersion(
          account
        ) + 1,

      updatedAt:
        now,
    };

    await putAccountRecord(
      env,
      sessionState.session.accountKey,
      updatedAccount
    );

    return jsonResponse(
      {
        success: true,
        authenticated: false,

        message:
          "Password changed successfully. Log in again with your new password.",
      },
      200,
      {
        "Set-Cookie":
          buildClearedSessionCookie(),
      }
    );
  } catch (error) {
    console.error(
      "Change password request error:",
      error
    );

    return handleApiError(error);
  }
}

async function inspectCustomerSession(
  request,
  env
) {
  try {
    validateEnvironment(env);

    const token =
      getSessionToken(request);

    if (!token) {
      return {
        hasToken: false,
        session: null,
      };
    }

    const payload =
      await verifyCustomerSessionToken(
        token,
        env
      );

    if (!payload) {
      return {
        hasToken: true,
        session: null,
      };
    }

    const accountKey =
      await getAccountKey(
        payload.email
      );

    const account =
      await env.DOCUMENTS_KV.get(
        accountKey,
        "json"
      );

    if (
      !account ||
      account.status !== "active" ||
      account.id !== payload.sub ||
      normalizeAccountEmail(
        account.email
      ) !== payload.email ||
      getAccountSessionVersion(
        account
      ) !==
        getPayloadSessionVersion(
          payload
        )
    ) {
      return {
        hasToken: true,
        session: null,
      };
    }

    return {
      hasToken: true,

      session: {
        account,
        accountKey,
        payload,
      },
    };
  } catch (error) {
    console.error(
      "Customer session inspection failed:",
      error
    );

    return {
      hasToken:
        Boolean(
          getSessionToken(request)
        ),

      session:
        null,
    };
  }
}

function validateEnvironment(env) {
  if (
    !env.DOCUMENTS_KV ||
    !env.DOCUMENT_ADMIN_SECRET
  ) {
    throw new ApiRequestError(
      "Customer authentication has not been configured.",
      500
    );
  }

  if (!env.ORDER_RATE_LIMITER) {
    throw new ApiRequestError(
      "Authentication rate limiting has not been configured.",
      500
    );
  }
}

async function putAccountRecord(
  env,
  accountKey,
  account
) {
  await env.DOCUMENTS_KV.put(
    accountKey,

    JSON.stringify(account),

    {
      metadata: {
        accountId:
          account.id,

        email:
          account.email,

        status:
          account.status,

        createdAt:
          account.createdAt || "",

        updatedAt:
          account.updatedAt || "",
      },
    }
  );
}

async function enforceAuthenticationRateLimit(
  request,
  env,
  action
) {
  const clientIdentifier =
    getClientIdentifier(request);

  let result;

  try {
    result =
      await env.ORDER_RATE_LIMITER.limit(
        {
          key:
            `auth:${action}:${clientIdentifier}`,
        }
      );
  } catch (error) {
    console.error(
      "Authentication rate limiter failed:",
      error
    );

    throw new ApiRequestError(
      "Account access is temporarily unavailable. Please try again shortly.",
      503
    );
  }

  if (!result.success) {
    throw new ApiRequestError(
      "Too many account attempts were received. Please wait one minute and try again.",
      429
    );
  }
}

function getClientIdentifier(
  request
) {
  const cloudflareIp =
    request.headers.get(
      "CF-Connecting-IP"
    );

  if (cloudflareIp) {
    return cleanText(
      cloudflareIp,
      100
    );
  }

  const forwardedFor =
    request.headers.get(
      "X-Forwarded-For"
    );

  if (forwardedFor) {
    return cleanText(
      forwardedFor.split(",")[0],
      100
    );
  }

  return "unknown-client";
}

function requireSameOrigin(
  request
) {
  const requestUrl =
    new URL(request.url);

  const origin =
    request.headers.get(
      "Origin"
    );

  const fetchSite =
    request.headers.get(
      "Sec-Fetch-Site"
    );

  if (
    origin &&
    origin !== requestUrl.origin
  ) {
    throw new ApiRequestError(
      "Cross-site requests are not allowed.",
      403
    );
  }

  if (
    fetchSite &&
    ![
      "same-origin",
      "same-site",
      "none",
    ].includes(fetchSite)
  ) {
    throw new ApiRequestError(
      "Cross-site requests are not allowed.",
      403
    );
  }
}

function validateJsonContentType(
  request
) {
  const contentType =
    request.headers.get(
      "Content-Type"
    ) || "";

  if (
    !contentType
      .toLowerCase()
      .includes(
        "application/json"
      )
  ) {
    throw new ApiRequestError(
      "Content-Type must be application/json.",
      415
    );
  }
}

async function readJsonRequest(
  request,
  maximumLength
) {
  const declaredLength =
    Number(
      request.headers.get(
        "Content-Length"
      ) || 0
    );

  if (
    Number.isFinite(
      declaredLength
    ) &&
    declaredLength >
      maximumLength
  ) {
    throw new ApiRequestError(
      "The request is too large.",
      413
    );
  }

  const text =
    await request.text();

  if (
    text.length >
    maximumLength
  ) {
    throw new ApiRequestError(
      "The request is too large.",
      413
    );
  }

  try {
    const body =
      JSON.parse(text);

    if (
      !body ||
      typeof body !==
        "object" ||
      Array.isArray(body)
    ) {
      throw new Error(
        "Invalid JSON object."
      );
    }

    return body;
  } catch {
    throw new ApiRequestError(
      "The request contains invalid JSON.",
      400
    );
  }
}

function validateAccountPassword(
  value
) {
  const password =
    String(
      value == null
        ? ""
        : value
    );

  if (
    password.length <
    MIN_PASSWORD_LENGTH
  ) {
    throw new ApiRequestError(
      `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
      400
    );
  }

  if (
    password.length >
    MAX_PASSWORD_LENGTH
  ) {
    throw new ApiRequestError(
      `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`,
      400
    );
  }

  return password;
}

function normalizeAccountEmail(
  value
) {
  const email =
    cleanText(
      value,
      MAX_ACCOUNT_EMAIL_LENGTH
    ).toLowerCase();

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new ApiRequestError(
      "Enter a valid email address.",
      400
    );
  }

  return email;
}

async function getAccountKey(
  email
) {
  const emailHash =
    await sha256Hex(
      normalizeAccountEmail(
        email
      )
    );

  return `${ACCOUNT_KEY_PREFIX}${emailHash}`;
}

async function derivePasswordHash(
  password,
  salt,
  iterations =
    PASSWORD_HASH_ITERATIONS
) {
  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",

      new TextEncoder().encode(
        password
      ),

      "PBKDF2",

      false,

      [
        "deriveBits",
      ]
    );

  const derivedBits =
    await crypto.subtle.deriveBits(
      {
        name:
          "PBKDF2",

        salt,

        iterations,

        hash:
          "SHA-256",
      },

      keyMaterial,

      256
    );

  return new Uint8Array(
    derivedBits
  );
}

async function verifyPassword(
  password,
  account
) {
  try {
    const salt =
      base64UrlToBytes(
        account.passwordSalt
      );

    const expectedHash =
      base64UrlToBytes(
        account.passwordHash
      );

    const iterations =
      Number(
        account.passwordIterations
      ) ||
      PASSWORD_HASH_ITERATIONS;

    const submittedHash =
      await derivePasswordHash(
        password,
        salt,
        iterations
      );

    return constantTimeBytesEqual(
      submittedHash,
      expectedHash
    );
  } catch (error) {
    console.error(
      "Password verification failed:",
      error
    );

    return false;
  }
}

function constantTimeBytesEqual(
  left,
  right
) {
  if (
    !(
      left instanceof
      Uint8Array
    ) ||
    !(
      right instanceof
      Uint8Array
    )
  ) {
    return false;
  }

  let difference =
    left.length ^
    right.length;

  const maximumLength =
    Math.max(
      left.length,
      right.length
    );

  for (
    let index = 0;
    index < maximumLength;
    index += 1
  ) {
    difference |=
      (left[index] || 0) ^
      (right[index] || 0);
  }

  return difference === 0;
}

function randomBytes(
  length
) {
  const bytes =
    new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return bytes;
}

async function sha256Hex(
  value
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",

      new TextEncoder().encode(
        String(value)
      )
    );

  return Array.from(
    new Uint8Array(digest)
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

function getAccountSessionVersion(
  account
) {
  const sessionVersion =
    Number(
      account?.sessionVersion
    );

  return (
    Number.isSafeInteger(
      sessionVersion
    ) &&
    sessionVersion > 0
  )
    ? sessionVersion
    : 1;
}

function getPayloadSessionVersion(
  payload
) {
  const sessionVersion =
    Number(
      payload?.sv
    );

  return (
    Number.isSafeInteger(
      sessionVersion
    ) &&
    sessionVersion > 0
  )
    ? sessionVersion
    : 1;
}

async function createCustomerSessionToken(
  account,
  env
) {
  const issuedAt =
    Math.floor(
      Date.now() / 1000
    );

  const payload = {
    v:
      1,

    sub:
      account.id,

    email:
      normalizeAccountEmail(
        account.email
      ),

    firstName:
      account.firstName || "",

    lastName:
      account.lastName || "",

    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt ||
      "",

    accountCreatedAt:
      account.createdAt || "",

    accountUpdatedAt:
      account.updatedAt || "",

    sv:
      getAccountSessionVersion(
        account
      ),

    iat:
      issuedAt,

    exp:
      issuedAt +
      SESSION_TTL_SECONDS,
  };

  const encodedPayload =
    bytesToBase64Url(
      new TextEncoder().encode(
        JSON.stringify(payload)
      )
    );

  const signature =
    await signCustomerSessionPayload(
      encodedPayload,
      env
    );

  return `${encodedPayload}.${bytesToBase64Url(
    signature
  )}`;
}

async function verifyCustomerSessionToken(
  token,
  env
) {
  const parts =
    String(
      token || ""
    ).split(".");

  if (
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1]
  ) {
    return null;
  }

  let payload;
  let signature;

  try {
    payload =
      JSON.parse(
        new TextDecoder().decode(
          base64UrlToBytes(
            parts[0]
          )
        )
      );

    signature =
      base64UrlToBytes(
        parts[1]
      );
  } catch {
    return null;
  }

  const key =
    await getCustomerSessionSigningKey(
      env
    );

  const signatureValid =
    await crypto.subtle.verify(
      "HMAC",

      key,

      signature,

      new TextEncoder().encode(
        parts[0]
      )
    );

  if (!signatureValid) {
    return null;
  }

  const now =
    Math.floor(
      Date.now() / 1000
    );

  if (
    payload.v !== 1 ||
    !payload.sub ||
    !payload.email ||
    !Number.isFinite(
      Number(
        payload.iat
      )
    ) ||
    !Number.isFinite(
      Number(
        payload.exp
      )
    ) ||
    Number(
      payload.exp
    ) <= now ||
    Number(
      payload.iat
    ) > now + 300
  ) {
    return null;
  }

  try {
    payload.email =
      normalizeAccountEmail(
        payload.email
      );
  } catch {
    return null;
  }

  return payload;
}

async function signCustomerSessionPayload(
  encodedPayload,
  env
) {
  const key =
    await getCustomerSessionSigningKey(
      env
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",

      key,

      new TextEncoder().encode(
        encodedPayload
      )
    );

  return new Uint8Array(
    signature
  );
}

async function getCustomerSessionSigningKey(
  env
) {
  const secretMaterial =
    await crypto.subtle.digest(
      "SHA-256",

      new TextEncoder().encode(
        `304-customer-session-v1:${String(
          env.DOCUMENT_ADMIN_SECRET
        )}`
      )
    );

  return crypto.subtle.importKey(
    "raw",

    secretMaterial,

    {
      name:
        "HMAC",

      hash:
        "SHA-256",
    },

    false,

    [
      "sign",
      "verify",
    ]
  );
}

function getSessionToken(
  request
) {
  const cookieHeader =
    request.headers.get(
      "Cookie"
    ) || "";

  const cookies =
    cookieHeader.split(";");

  for (
    const cookie of cookies
  ) {
    const separatorIndex =
      cookie.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const name =
      cookie
        .slice(
          0,
          separatorIndex
        )
        .trim();

    const value =
      cookie
        .slice(
          separatorIndex + 1
        )
        .trim();

    if (
      name ===
      SESSION_COOKIE_NAME
    ) {
      return value;
    }
  }

  return "";
}

function buildSessionCookie(
  token
) {
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

function buildClearedSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

function bytesToBase64Url(
  bytes
) {
  let binary = "";

  for (
    const byte of bytes
  ) {
    binary +=
      String.fromCharCode(
        byte
      );
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const padded =
    normalized.padEnd(
      normalized.length +
        (
          (
            4 -
            (
              normalized.length %
              4
            )
          ) %
          4
        ),
      "="
    );

  const binary =
    atob(padded);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index
      );
  }

  return bytes;
}

function cleanText(
  value,
  maximumLength
) {
  return String(
    value == null
      ? ""
      : value
  )
    .replace(
      /[\u0000-\u001F\u007F]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function jsonResponse(
  body,
  status = 200,
  extraHeaders = {}
) {
  const headers =
    new Headers({
      "Content-Type":
        "application/json; charset=utf-8",

      "Cache-Control":
        "no-store",

      ...extraHeaders,
    });

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers,
    }
  );
}

function handleApiError(
  error
) {
  const status =
    error instanceof
    ApiRequestError
      ? error.status
      : 500;

  const shouldClearSession =
    status === 401 &&
    error?.message ===
      "Customer authentication is required.";

  return jsonResponse(
    {
      success: false,

      error:
        error?.message ||
        "The account request could not be completed.",
    },

    status,

    shouldClearSession
      ? {
          "Set-Cookie":
            buildClearedSessionCookie(),
        }
      : {}
  );
}

class ApiRequestError extends Error {
  constructor(
    message,
    status = 400
  ) {
    super(message);

    this.name =
      "ApiRequestError";

    this.status =
      status;
  }
}