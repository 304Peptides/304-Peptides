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

    if (url.pathname === "/api/admin/accounts") {
      return handleAdminAccountDirectoryRequest(request, env);
    }

    if (url.pathname === "/api/admin/accounts/reset-password") {
      return handleAdminPasswordResetRequest(request, env);
    }

    if (url.pathname === "/api/auth/change-password") {
      return handleChangePasswordRequest(request, env);
    }

    if (
      request.method === "POST" &&
      ["/api/auth/register", "/api/auth/login"].includes(url.pathname)
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

      if (!sessionState.session) {
        return jsonResponse(
          {
            success: true,
            authenticated: false,
            account: null,
          },
          200,
          sessionState.hasToken
            ? {
                "Set-Cookie":
                  buildClearedSessionCookie(),
              }
            : {}
        );
      }

      return jsonResponse({
        success: true,
        authenticated: true,

        account:
          toPublicAccount(
            sessionState.session
              .account
          ),

        requiresPasswordChange:
          Boolean(
            sessionState.session
              .account
              .mustChangePassword
          ),
      });
    }

    if (
      url.pathname ===
      "/api/account/orders"
    ) {
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

      if (
        sessionState.session
          .account
          .mustChangePassword
      ) {
        return jsonResponse(
          {
            success: false,

            error:
              "Change your temporary password before accessing account orders.",

            requiresPasswordChange:
              true,
          },
          403
        );
      }
    }

    if (
      url.pathname ===
        "/api/order" &&
      request.method ===
        "POST"
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

      if (
        sessionState.session &&
        sessionState.session
          .account
          .mustChangePassword
      ) {
        return jsonResponse(
          {
            success: false,

            error:
              "Change your temporary password before submitting an order.",

            requiresPasswordChange:
              true,
          },
          403
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

async function handleAdminAccountDirectoryRequest(
  request,
  env
) {
  try {
    validateEnvironment(
      env
    );

    if (
      request.method !==
      "GET"
    ) {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(
      request
    );

    await requireAdminAuthorization(
      request,
      env
    );

    const records =
      await listCustomerAccounts(
        env
      );

    return jsonResponse({
      success: true,
      records,
      accounts: records,
      count: records.length,
    });
  } catch (
    error
  ) {
    console.error(
      "Admin account directory request error:",
      error
    );

    return handleApiError(
      error
    );
  }
}

async function listCustomerAccounts(
  env
) {
  const accountKeys = [];

  let cursor = "";
  let listComplete =
    false;

  while (!listComplete) {
    const options = {
      prefix:
        ACCOUNT_KEY_PREFIX,

      limit:
        1000,
    };

    if (cursor) {
      options.cursor =
        cursor;
    }

    const page =
      await env.DOCUMENTS_KV.list(
        options
      );

    accountKeys.push(
      ...(
        Array.isArray(
          page.keys
        )
          ? page.keys.map(
              (
                key
              ) =>
                key.name
            )
          : []
      )
    );

    listComplete =
      page.list_complete ===
      true;

    cursor =
      page.cursor ||
      "";

    if (
      !listComplete &&
      !cursor
    ) {
      throw new ApiRequestError(
        "The customer account directory could not be fully paginated.",
        503
      );
    }
  }

  const accounts = [];

  for (
    let index = 0;

    index <
    accountKeys.length;

    index += 100
  ) {
    const batch =
      accountKeys.slice(
        index,
        index + 100
      );

    if (
      batch.length ===
      0
    ) {
      continue;
    }

    const values =
      await env.DOCUMENTS_KV.get(
        batch,
        {
          type:
            "json",
        }
      );

    for (
      const key of batch
    ) {
      const account =
        values.get(
          key
        );

      if (
        account &&
        typeof account ===
          "object"
      ) {
        accounts.push(
          toAdminAccountSummary(
            account
          )
        );
      }
    }
  }

  return accounts.sort(
    (
      left,
      right
    ) => {
      const leftDate =
        String(
          left.createdAt ||
            left.updatedAt ||
            ""
        );

      const rightDate =
        String(
          right.createdAt ||
            right.updatedAt ||
            ""
        );

      return rightDate.localeCompare(
        leftDate
      );
    }
  );
}

async function handleAdminPasswordResetRequest(
  request,
  env
) {
  try {
    validateEnvironment(
      env
    );

    if (
      request.method !==
      "POST"
    ) {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(
      request
    );

    validateJsonContentType(
      request
    );

    await requireAdminAuthorization(
      request,
      env
    );

    await enforceAuthenticationRateLimit(
      request,
      env,
      "admin-password-reset"
    );

    const body =
      await readJsonRequest(
        request,
        MAX_AUTH_REQUEST_LENGTH
      );

    const email =
      normalizeAccountEmail(
        body.email
      );

    const accountKey =
      await getAccountKey(
        email
      );

    const account =
      await env.DOCUMENTS_KV.get(
        accountKey,
        "json"
      );

    if (
      !account ||
      account.status !==
        "active"
    ) {
      throw new ApiRequestError(
        "No active customer account was found for that email address.",
        404
      );
    }

    const temporaryPassword =
      createTemporaryPassword(
        20
      );

    const salt =
      randomBytes(
        16
      );

    const passwordHash =
      await derivePasswordHash(
        temporaryPassword,
        salt
      );

    const now =
      new Date().toISOString();

    const updatedAccount = {
      ...account,

      passwordHash:
        bytesToBase64Url(
          passwordHash
        ),

      passwordSalt:
        bytesToBase64Url(
          salt
        ),

      passwordIterations:
        PASSWORD_HASH_ITERATIONS,

      mustChangePassword:
        true,

      temporaryPasswordIssuedAt:
        now,

      passwordChangedAt:
        now,

      sessionVersion:
        getAccountSessionVersion(
          account
        ) +
        1,

      updatedAt:
        now,
    };

    await putAccountRecord(
      env,
      accountKey,
      updatedAccount
    );

    return jsonResponse({
      success: true,

      email:
        updatedAccount.email,

      temporaryPassword,

      issuedAt:
        now,

      requiresPasswordChange:
        true,

      account:
        toAdminAccountSummary(
          updatedAccount
        ),

      message:
        "A temporary password was created. Existing sessions were invalidated, and the customer must change the password after logging in.",
    });
  } catch (
    error
  ) {
    console.error(
      "Admin password reset request error:",
      error
    );

    return handleApiError(
      error
    );
  }
}

async function handleChangePasswordRequest(
  request,
  env
) {
  try {
    validateEnvironment(
      env
    );

    if (
      request.method !==
      "POST"
    ) {
      throw new ApiRequestError(
        "Method not allowed.",
        405
      );
    }

    requireSameOrigin(
      request
    );

    validateJsonContentType(
      request
    );

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

    if (
      !sessionState.session
    ) {
      throw new ApiRequestError(
        "Customer authentication is required.",
        401
      );
    }

    const body =
      await readJsonRequest(
        request,
        MAX_AUTH_REQUEST_LENGTH
      );

    const currentPassword =
      String(
        body.currentPassword ==
        null
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
      sessionState.session
        .account;

    const passwordMatches =
      await verifyPassword(
        currentPassword,
        account
      );

    if (
      !passwordMatches
    ) {
      throw new ApiRequestError(
        "The current password is incorrect.",
        401
      );
    }

    if (
      currentPassword ===
      newPassword
    ) {
      throw new ApiRequestError(
        "The new password must be different from the current password.",
        400
      );
    }

    const salt =
      randomBytes(
        16
      );

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
        bytesToBase64Url(
          passwordHash
        ),

      passwordSalt:
        bytesToBase64Url(
          salt
        ),

      passwordIterations:
        PASSWORD_HASH_ITERATIONS,

      passwordChangedAt:
        now,

      passwordResetCompletedAt:
        now,

      mustChangePassword:
        false,

      temporaryPasswordIssuedAt:
        "",

      sessionVersion:
        getAccountSessionVersion(
          account
        ) +
        1,

      updatedAt:
        now,
    };

    await putAccountRecord(
      env,
      sessionState.session
        .accountKey,
      updatedAccount
    );

    return jsonResponse(
      {
        success: true,

        authenticated:
          false,

        message:
          "Password changed successfully. Log in again with your new password.",
      },
      200,
      {
        "Set-Cookie":
          buildClearedSessionCookie(),
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Change password request error:",
      error
    );

    return handleApiError(
      error
    );
  }
}

async function upgradeAuthenticationResponse(
  response,
  env
) {
  if (
    !response.ok
  ) {
    return response;
  }

  let result;

  try {
    result =
      await response
        .clone()
        .json();
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
    validateEnvironment(
      env
    );

    const accountKey =
      await getAccountKey(
        result.account.email
      );

    const storedAccount =
      await env.DOCUMENTS_KV.get(
        accountKey,
        "json"
      );

    const account =
      storedAccount ||
      result.account;

    const sessionVersion =
      getAccountSessionVersion(
        account
      );

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

    const headers =
      new Headers(
        response.headers
      );

    headers.set(
      "Set-Cookie",
      buildSessionCookie(
        token
      )
    );

    headers.set(
      "Cache-Control",
      "no-store"
    );

    headers.set(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    headers.delete(
      "Content-Length"
    );

    return new Response(
      JSON.stringify({
        ...result,

        account:
          toPublicAccount(
            account
          ),

        requiresPasswordChange:
          Boolean(
            account.mustChangePassword
          ),
      }),
      {
        status:
          response.status,

        statusText:
          response.statusText,

        headers,
      }
    );
  } catch (
    error
  ) {
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

async function inspectCustomerSession(
  request,
  env
) {
  try {
    validateEnvironment(
      env
    );

    const token =
      getSessionToken(
        request
      );

    if (!token) {
      return {
        hasToken:
          false,

        session:
          null,
      };
    }

    const payload =
      await verifyCustomerSessionToken(
        token,
        env
      );

    if (!payload) {
      return {
        hasToken:
          true,

        session:
          null,
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
      account.status !==
        "active" ||
      account.id !==
        payload.sub ||
      normalizeAccountEmail(
        account.email
      ) !==
        payload.email ||
      getAccountSessionVersion(
        account
      ) !==
        getPayloadSessionVersion(
          payload
        )
    ) {
      return {
        hasToken:
          true,

        session:
          null,
      };
    }

    return {
      hasToken:
        true,

      session: {
        account,
        accountKey,
        payload,
      },
    };
  } catch (
    error
  ) {
    console.error(
      "Customer session inspection failed:",
      error
    );

    return {
      hasToken:
        Boolean(
          getSessionToken(
            request
          )
        ),

      session:
        null,
    };
  }
}

function validateEnvironment(
  env
) {
  if (
    !env.DOCUMENTS_KV ||
    !env.DOCUMENT_ADMIN_SECRET
  ) {
    throw new ApiRequestError(
      "Customer authentication has not been configured.",
      500
    );
  }

  if (
    !env.ORDER_RATE_LIMITER
  ) {
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
    JSON.stringify(
      account
    ),
    {
      metadata: {
        accountId:
          account.id,

        firstName:
          account.firstName ||
          "",

        lastName:
          account.lastName ||
          "",

        email:
          account.email,

        status:
          account.status,

        mustChangePassword:
          Boolean(
            account.mustChangePassword
          ),

        temporaryPasswordIssuedAt:
          account.temporaryPasswordIssuedAt ||
          "",

        createdAt:
          account.createdAt ||
          "",

        updatedAt:
          account.updatedAt ||
          "",
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
    getClientIdentifier(
      request
    );

  let result;

  try {
    result =
      await env.ORDER_RATE_LIMITER.limit(
        {
          key:
            `auth:${action}:${clientIdentifier}`,
        }
      );
  } catch (
    error
  ) {
    console.error(
      "Authentication rate limiter failed:",
      error
    );

    throw new ApiRequestError(
      "Account access is temporarily unavailable. Please try again shortly.",
      503
    );
  }

  if (
    !result.success
  ) {
    throw new ApiRequestError(
      "Too many account attempts were received. Please wait one minute and try again.",
      429
    );
  }
}

async function requireAdminAuthorization(
  request,
  env
) {
  const authorization =
    request.headers.get(
      "Authorization"
    ) || "";

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  const suppliedSecret =
    match
      ? match[1].trim()
      : "";

  const expectedSecret =
    String(
      env.DOCUMENT_ADMIN_SECRET ||
        ""
    );

  if (
    !suppliedSecret ||
    !expectedSecret ||
    !(
      await constantTimeStringEqual(
        suppliedSecret,
        expectedSecret
      )
    )
  ) {
    throw new ApiRequestError(
      "Administrator authorization is required.",
      401
    );
  }
}

async function constantTimeStringEqual(
  left,
  right
) {
  const [
    leftDigest,
    rightDigest,
  ] =
    await Promise.all([
      crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          String(
            left
          )
        )
      ),

      crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          String(
            right
          )
        )
      ),
    ]);

  return constantTimeBytesEqual(
    new Uint8Array(
      leftDigest
    ),

    new Uint8Array(
      rightDigest
    )
  );
}

function createTemporaryPassword(
  length = 20
) {
  const uppercase =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lowercase =
    "abcdefghijkmnopqrstuvwxyz";

  const digits =
    "23456789";

  const symbols =
    "!@#$%*+-_";

  const allCharacters =
    uppercase +
    lowercase +
    digits +
    symbols;

  const characters = [
    uppercase[
      randomIndex(
        uppercase.length
      )
    ],

    lowercase[
      randomIndex(
        lowercase.length
      )
    ],

    digits[
      randomIndex(
        digits.length
      )
    ],

    symbols[
      randomIndex(
        symbols.length
      )
    ],
  ];

  while (
    characters.length <
    Math.max(
      12,
      length
    )
  ) {
    characters.push(
      allCharacters[
        randomIndex(
          allCharacters.length
        )
      ]
    );
  }

  for (
    let index =
      characters.length -
      1;

    index >
    0;

    index -=
      1
  ) {
    const swapIndex =
      randomIndex(
        index +
          1
      );

    [
      characters[index],
      characters[swapIndex],
    ] = [
      characters[swapIndex],
      characters[index],
    ];
  }

  return characters.join(
    ""
  );
}

function randomIndex(
  maximum
) {
  if (
    !Number.isSafeInteger(
      maximum
    ) ||
    maximum <=
      0
  ) {
    throw new Error(
      "A valid random range is required."
    );
  }

  const limit =
    Math.floor(
      0x100000000 /
        maximum
    ) *
    maximum;

  const values =
    new Uint32Array(
      1
    );

  do {
    crypto.getRandomValues(
      values
    );
  } while (
    values[0] >=
    limit
  );

  return (
    values[0] %
    maximum
  );
}

function getClientIdentifier(
  request
) {
  const cloudflareIp =
    request.headers.get(
      "CF-Connecting-IP"
    );

  if (
    cloudflareIp
  ) {
    return cleanText(
      cloudflareIp,
      100
    );
  }

  const forwardedFor =
    request.headers.get(
      "X-Forwarded-For"
    );

  if (
    forwardedFor
  ) {
    return cleanText(
      forwardedFor.split(
        ","
      )[0],
      100
    );
  }

  return "unknown-client";
}

function requireSameOrigin(
  request
) {
  const requestUrl =
    new URL(
      request.url
    );

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
    origin !==
      requestUrl.origin
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
    ].includes(
      fetchSite
    )
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
      ) ||
        0
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
      JSON.parse(
        text
      );

    if (
      !body ||
      typeof body !==
        "object" ||
      Array.isArray(
        body
      )
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
      value ==
      null
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
  } catch (
    error
  ) {
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

    index <
    maximumLength;

    index +=
      1
  ) {
    difference |=
      (
        left[index] ||
        0
      ) ^
      (
        right[index] ||
        0
      );
  }

  return (
    difference ===
    0
  );
}

function randomBytes(
  length
) {
  const bytes =
    new Uint8Array(
      length
    );

  crypto.getRandomValues(
    bytes
  );

  return bytes;
}

async function sha256Hex(
  value
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",

      new TextEncoder().encode(
        String(
          value
        )
      )
    );

  return Array.from(
    new Uint8Array(
      digest
    )
  )
    .map(
      (
        byte
      ) =>
        byte
          .toString(
            16
          )
          .padStart(
            2,
            "0"
          )
    )
    .join(
      ""
    );
}

function getAccountSessionVersion(
  account
) {
  const sessionVersion =
    Number(
      account
        ?.sessionVersion
    );

  return (
    Number.isSafeInteger(
      sessionVersion
    ) &&
    sessionVersion >
      0
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
    sessionVersion >
      0
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
      Date.now() /
        1000
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
      account.firstName ||
      "",

    lastName:
      account.lastName ||
      "",

    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt ||
      "",

    accountCreatedAt:
      account.createdAt ||
      "",

    accountUpdatedAt:
      account.updatedAt ||
      "",

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
        JSON.stringify(
          payload
        )
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
      token ||
        ""
    ).split(
      "."
    );

  if (
    parts.length !==
      2 ||
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

  if (
    !signatureValid
  ) {
    return null;
  }

  const now =
    Math.floor(
      Date.now() /
        1000
    );

  if (
    payload.v !==
      1 ||
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
    ) <=
      now ||
    Number(
      payload.iat
    ) >
      now +
        300
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

  for (
    const cookie of cookieHeader.split(
      ";"
    )
  ) {
    const separatorIndex =
      cookie.indexOf(
        "="
      );

    if (
      separatorIndex <
      0
    ) {
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
          separatorIndex +
            1
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
  ].join(
    "; "
  );
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
  ].join(
    "; "
  );
}

function bytesToBase64Url(
  bytes
) {
  let binary =
    "";

  for (
    const byte of bytes
  ) {
    binary +=
      String.fromCharCode(
        byte
      );
  }

  return btoa(
    binary
  )
    .replace(
      /\+/g,
      "-"
    )
    .replace(
      /\//g,
      "_"
    )
    .replace(
      /=+$/g,
      ""
    );
}

function base64UrlToBytes(
  value
) {
  const normalized =
    String(
      value ||
        ""
    )
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

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
    atob(
      padded
    );

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let index = 0;

    index <
    binary.length;

    index +=
      1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index
      );
  }

  return bytes;
}

function toPublicAccount(
  account
) {
  return {
    id:
      account.id,

    firstName:
      account.firstName,

    lastName:
      account.lastName,

    email:
      account.email,

    status:
      account.status,

    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt,

    createdAt:
      account.createdAt,

    updatedAt:
      account.updatedAt,

    mustChangePassword:
      Boolean(
        account.mustChangePassword
      ),
  };
}

function toAdminAccountSummary(
  account
) {
  return {
    id:
      String(
        account.id ||
          ""
      ),

    firstName:
      cleanText(
        account.firstName,
        100
      ),

    lastName:
      cleanText(
        account.lastName,
        100
      ),

    email:
      cleanText(
        account.email,
        MAX_ACCOUNT_EMAIL_LENGTH
      ).toLowerCase(),

    status:
      cleanText(
        account.status ||
          "active",
        50
      ),

    researchAgreementAcceptedAt:
      account.researchAgreementAcceptedAt ||
      "",

    createdAt:
      account.createdAt ||
      "",

    updatedAt:
      account.updatedAt ||
      "",

    mustChangePassword:
      Boolean(
        account.mustChangePassword
      ),

    temporaryPasswordIssuedAt:
      account.temporaryPasswordIssuedAt ||
      "",

    passwordChangedAt:
      account.passwordChangedAt ||
      "",

    passwordResetCompletedAt:
      account.passwordResetCompletedAt ||
      "",
  };
}

function cleanText(
  value,
  maximumLength
) {
  return String(
    value ==
    null
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
    JSON.stringify(
      body
    ),
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
    status ===
      401 &&
    error?.message ===
      "Customer authentication is required.";

  return jsonResponse(
    {
      success:
        false,

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
    super(
      message
    );

    this.name =
      "ApiRequestError";

    this.status =
      status;
  }
}