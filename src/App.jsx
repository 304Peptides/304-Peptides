import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./index.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AgeGate from "./components/AgeGate";
import SiteAlert from "./components/SiteAlert";
import AdminLayout from "./components/AdminLayout";

const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const Quality = lazy(() => import("./pages/Quality"));
const ResearchPartners = lazy(() => import("./pages/ResearchPartners"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const CreateAccount = lazy(() => import("./pages/CreateAccount"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const PartnerApplication = lazy(() => import("./pages/PartnerApplication"));
const PartnerHQ = lazy(() => import("./pages/PartnerHQ"));
const MarketingCenter = lazy(() => import("./pages/MarketingCenter"));
const MissionControl = lazy(() => import("./pages/MissionControl"));
const ProductManager = lazy(() => import("./pages/ProductManager"));
const CouponManager = lazy(() => import("./pages/CouponManager"));
const VialLabelGenerator = lazy(() => import("./pages/VialLabelGenerator"));
const ShippingCenter = lazy(() => import("./pages/ShippingCenter"));
const COAManager = lazy(() => import("./pages/COAManager"));
const CustomerManager = lazy(() => import("./pages/CustomerManager"));
const SiteSettings = lazy(() => import("./pages/SiteSettings"));
const LaunchChecklist = lazy(() => import("./pages/LaunchChecklist"));
const ResearchAgreement = lazy(() => import("./pages/ResearchAgreement"));
const QRManager = lazy(() => import("./pages/QRManager"));
const VerificationRecord = lazy(() => import("./pages/VerificationRecord"));
import { fetchCatalogOverrides } from "./data/catalogRuntime";
import { applyPageSeo } from "./utils/seo";
import {
  getProductFromPathname,
  getProductPath,
  readProductRoute,
} from "./utils/catalogRoutes";

const storageKeys = {
  ageGateAccepted: "ageGateAccepted",
  cartItems: "cartItems",
  orders: "orders",
  latestOrder: "latestOrder",
  selectedProduct: "selectedProduct",
};

const customerAccountSessionKey = "304-customer-account";
const legacyLoginStorageKey = "isLoggedIn";

const customerProtectedPages = new Set([
  "dashboard",
  "changePassword",
  "partnerApplication",
  "cart",
  "checkout",
]);

const pagePaths = {
  home: "/",
  products: "/products",
  quality: "/quality",
  partners: "/affiliate",
  faq: "/faq",
  contact: "/contact",
  researchAgreement: "/research-agreement",
  login: "/login",
  createAccount: "/create-account",
  dashboard: "/dashboard",
  changePassword: "/change-password",
  partnerApplication: "/partner-application",
  partnerHQ: "/admin/partner-hq",
  marketingCenter: "/admin/marketing",
  missionControl: "/admin",
  orderManager: "/admin/orders",
  affiliateManager: "/admin/affiliates",
  inventoryManager: "/admin/inventory",
  accountingManager: "/admin/accounting",
  productManager: "/admin/products",
  couponManager: "/admin/coupons",
  vialLabelGenerator: "/admin/vial-labels",
  shippingCenter: "/admin/shipping",
  coaManager: "/admin/coa",
  qrManager: "/admin/qr",
  customerManager: "/admin/customers",
  siteSettings: "/admin/settings",
  launchChecklist: "/admin/launch-checklist",
  cart: "/cart",
  checkout: "/checkout",
  orderConfirmation: "/order-confirmation",
  productDetails: "/product-details",
};

const ADMIN_PAGES = new Set([
  "missionControl",
  "orderManager",
  "customerManager",
  "affiliateManager",
  "productManager",
  "inventoryManager",
  "couponManager",
  "vialLabelGenerator",
  "shippingCenter",
  "coaManager",
  "qrManager",
  "accountingManager",
  "siteSettings",
  "launchChecklist",
  "partnerHQ",
  "marketingCenter",
]);

function readStorage(key, fallbackValue) {
  try {
    const savedValue = window.localStorage.getItem(key);

    if (savedValue === null) {
      return fallbackValue;
    }

    return JSON.parse(savedValue);
  } catch {
    return fallbackValue;
  }
}

function readBooleanStorage(key, fallbackValue = false) {
  try {
    const savedValue = window.localStorage.getItem(key);

    if (savedValue === null) {
      return fallbackValue;
    }

    return savedValue === "true";
  } catch {
    return fallbackValue;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function writeBooleanStorage(key, value) {
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
    return true;
  } catch {
    return false;
  }
}

function removeStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage may be blocked.
  }
}

function writeSessionStorage(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeSessionStorage(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Session storage may be blocked.
  }
}

async function readApiJson(response) {
  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      "The account service returned an invalid response."
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ||
        "The account request could not be completed."
    );
  }

  return result;
}

function normalizeOrderRecords(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .filter(
      (order) =>
        order &&
        typeof order === "object"
    )
    .sort((left, right) =>
      String(
        right.createdAt ||
          right.updatedAt ||
          right.date ||
          ""
      ).localeCompare(
        String(
          left.createdAt ||
            left.updatedAt ||
            left.date ||
            ""
        )
      )
    );
}

function mergeOrderRecords(primaryOrders, secondaryOrders) {
  const seenOrderIds = new Set();

  return normalizeOrderRecords([
    ...primaryOrders,
    ...secondaryOrders,
  ]).filter((order) => {
    const orderId = String(
      order.orderId ||
        order.id ||
        ""
    );

    if (!orderId || seenOrderIds.has(orderId)) {
      return false;
    }

    seenOrderIds.add(orderId);
    return true;
  });
}

function getCartItemKey(item) {
  return `${item.codeName || ""}-${item.strength || ""}`;
}

function getRouteFromLocation() {
  const pathname =
    window.location.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/partners") {
    window.history.replaceState(
      {
        page: "partners",
      },
      "",
      pagePaths.partners
    );

    return {
      page: "partners",
      verificationCode: "",
      product: null,
    };
  }

  if (pathname === "/product-details") {
    window.history.replaceState(
      {
        page: "products",
      },
      "",
      pagePaths.products
    );

    return {
      page: "products",
      verificationCode: "",
      product: null,
    };
  }

  if (pathname.startsWith("/verify/")) {
    const encodedCode =
      pathname.slice(
        "/verify/".length
      );

    let code = encodedCode;

    try {
      code =
        decodeURIComponent(
          encodedCode
        );
    } catch {
      code = encodedCode;
    }

    return {
      page: "verification",
      verificationCode: code,
      product: null,
    };
  }

  if (
    pathname.startsWith(
      "/products/"
    )
  ) {
    const product =
      getProductFromPathname(
        pathname
      );

    return {
      page: product
        ? "productDetails"
        : "notFound",

      verificationCode: "",
      product,
    };
  }

  const matchingEntry =
    Object.entries(
      pagePaths
    ).find(
      ([, path]) =>
        path === pathname
    );

  if (matchingEntry) {
    return {
      page: matchingEntry[0],
      verificationCode: "",
      product: null,
    };
  }

  return {
    page: "notFound",
    verificationCode: "",
    product: null,
  };
}

function getPagePath(
  page,
  verificationCode = "",
  product = null
) {
  if (page === "verification") {
    return verificationCode
      ? `/verify/${encodeURIComponent(
          verificationCode
        )}`
      : "/";
  }

  if (
    page === "productDetails" &&
    product
  ) {
    return getProductPath(
      product
    );
  }

  return (
    pagePaths[page] ||
    window.location.pathname ||
    "/"
  );
}

function calculateTotalQuantity(items) {
  return items.reduce(
    (total, item) =>
      total +
      Number(item.quantity || 0),
    0
  );
}

function calculateSubtotal(items) {
  return items.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );
}

function createOrderId() {
  return `304-${Date.now().toString().slice(-8)}`;
}

function App() {
  const initialRoute = useMemo(getRouteFromLocation, []);

  const [
    ageGateAccepted,
    setAgeGateAccepted,
  ] = useState(() =>
    readBooleanStorage(storageKeys.ageGateAccepted)
  );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(initialRoute.page);

  const [
    verificationCode,
    setVerificationCode,
  ] = useState(initialRoute.verificationCode);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(() =>
    initialRoute.product ||
    readStorage(
      storageKeys.selectedProduct,
      null
    )
  );

  const [
    authenticationStatus,
    setAuthenticationStatus,
  ] = useState("checking");

  const [
    customerAccount,
    setCustomerAccount,
  ] = useState(null);

  const [
    authenticationError,
    setAuthenticationError,
  ] = useState("");

  const [
    cartItems,
    setCartItems,
  ] = useState(() => {
    const savedItems = readStorage(
      storageKeys.cartItems,
      []
    );

    return Array.isArray(savedItems)
      ? savedItems
      : [];
  });

  const [
    cartNotice,
    setCartNotice,
  ] = useState(null);

  const [
    orders,
    setOrders,
  ] = useState(() => {
    const savedOrders = readStorage(
      storageKeys.orders,
      []
    );

    return Array.isArray(savedOrders)
      ? savedOrders
      : [];
  });

  const [
    latestOrder,
    setLatestOrder,
  ] = useState(() =>
    readStorage(storageKeys.latestOrder, null)
  );

  const [
    partnerApplication,
    setPartnerApplication,
  ] = useState(null);

  const isAuthChecking = authenticationStatus === "checking" && !import.meta.env.DEV;

  const isLoggedIn = authenticationStatus === "authenticated" || import.meta.env.DEV;

  const cartCount = useMemo(
    () => calculateTotalQuantity(cartItems),
    [cartItems]
  );

  useEffect(() => {
    if (!cartNotice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCartNotice(null);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [cartNotice]);

  const goToPage = useCallback((page, options = {}) => {
    const suppliedCode =
      typeof options === "string"
        ? options
        : options.code || "";

    const suppliedProduct =
      typeof options === "object"
        ? options.product || null
        : null;

    const replaceHistory =
      typeof options === "object" &&
      Boolean(options.replace);

    if (page === "verification") {
      setVerificationCode(suppliedCode);
    } else {
      setVerificationCode("");
    }

    if (
      page === "productDetails" &&
      suppliedProduct
    ) {
      setSelectedProduct(
        suppliedProduct
      );

      writeStorage(
        storageKeys.selectedProduct,
        suppliedProduct
      );
    }

    setCurrentPage(page);

    const path = getPagePath(
      page,
      suppliedCode,
      suppliedProduct
    );

    const currentPath = window.location.pathname;

    if (currentPath !== path) {
      const historyMethod = replaceHistory
        ? "replaceState"
        : "pushState";

      window.history[historyMethod](
        {
          page,
          verificationCode: suppliedCode,
        },
        "",
        path
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const refreshCustomerOrders = useCallback(
    async ({ replace = true } = {}) => {
      const response = await fetch(
        "/api/account/orders",
        {
          method: "GET",

          headers: {
            Accept: "application/json",
          },

          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await readApiJson(response);

      const secureOrders = normalizeOrderRecords(
        result.records ||
          result.orders ||
          []
      );

      setOrders((currentOrders) => {
        const nextOrders = replace
          ? secureOrders
          : mergeOrderRecords(
              secureOrders,
              currentOrders
            );

        writeStorage(
          storageKeys.orders,
          nextOrders
        );

        return nextOrders;
      });

      setLatestOrder((currentLatestOrder) => {
        const nextLatestOrder =
          secureOrders[0] ||
          (replace
            ? null
            : currentLatestOrder);

        writeStorage(
          storageKeys.latestOrder,
          nextLatestOrder
        );

        return nextLatestOrder;
      });

      return secureOrders;
    },
    []
  );

  const refreshPartnerApplication = useCallback(
    async () => {
      const response = await fetch(
        "/api/partner/application",
        {
          method: "GET",

          headers: {
            Accept: "application/json",
          },

          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await readApiJson(response);
      const secureApplication =
        result.application || null;

      setPartnerApplication(secureApplication);

      return {
        application: secureApplication,
        eligibility: result.eligibility || null,
      };
    },
    []
  );

  const handleLogin = useCallback(
    (account) => {
      if (
        !account ||
        typeof account !== "object"
      ) {
        return;
      }

      setCustomerAccount(account);

      writeSessionStorage(
        customerAccountSessionKey,
        account
      );

      setAuthenticationStatus("authenticated");
      setAuthenticationError("");

      refreshCustomerOrders({
        replace: true,
      }).catch((error) => {
        setAuthenticationError(
          error.message ||
            "Login succeeded, but order history could not be loaded."
        );
      });

      refreshPartnerApplication().catch((error) => {
        console.error(
          "Affiliate application refresh failed after login:",
          error
        );

        setPartnerApplication(null);
      });
    },
    [
      refreshCustomerOrders,
      refreshPartnerApplication,
    ]
  );

  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/auth/logout",
        {
          method: "POST",

          headers: {
            Accept: "application/json",
          },

          credentials: "same-origin",
        }
      );

      await readApiJson(response);
    } catch (error) {
      console.error(
        "Customer logout request failed:",
        error
      );
    } finally {
      removeSessionStorage(
        customerAccountSessionKey
      );

      removeStorage(
        legacyLoginStorageKey
      );

      setAuthenticationStatus("guest");
      setCustomerAccount(null);
      setAuthenticationError("");

      setSelectedProduct(null);

      removeStorage(
        storageKeys.selectedProduct
      );

      setCartItems([]);

      writeStorage(
        storageKeys.cartItems,
        []
      );

      setOrders([]);

      removeStorage(
        storageKeys.orders
      );

      setLatestOrder(null);

      removeStorage(
        storageKeys.latestOrder
      );

      setPartnerApplication(null);

      goToPage("home");
    }
  }, [goToPage]);

  const handlePasswordChanged = useCallback(() => {
    removeSessionStorage(
      customerAccountSessionKey
    );

    removeStorage(
      legacyLoginStorageKey
    );

    setAuthenticationStatus("guest");
    setCustomerAccount(null);
    setAuthenticationError("");

    setOrders([]);

    removeStorage(
      storageKeys.orders
    );

    setLatestOrder(null);

    removeStorage(
      storageKeys.latestOrder
    );

    setPartnerApplication(null);

    goToPage("login", {
      replace: true,
    });
  }, [goToPage]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSecureSession() {
      setAuthenticationStatus("checking");
      setAuthenticationError("");

      removeStorage(
        legacyLoginStorageKey
      );

      try {
        const response = await fetch(
          "/api/auth/session",
          {
            method: "GET",

            headers: {
              Accept: "application/json",
            },

            credentials: "same-origin",
            cache: "no-store",
          }
        );

        const result = await readApiJson(response);

        if (!isMounted) {
          return;
        }

        if (
          result.authenticated &&
          result.account
        ) {
          setCustomerAccount(result.account);

          writeSessionStorage(
            customerAccountSessionKey,
            result.account
          );

          setAuthenticationStatus(
            "authenticated"
          );

          try {
            await refreshCustomerOrders({
              replace: true,
            });
          } catch (error) {
            if (isMounted) {
              setAuthenticationError(
                error.message ||
                  "Your account was restored, but order history could not be loaded."
              );
            }
          }

          try {
            await refreshPartnerApplication();
          } catch (error) {
            console.error(
              "Affiliate application refresh failed while restoring the session:",
              error
            );

            if (isMounted) {
              setPartnerApplication(null);
            }
          }

          return;
        }

        removeSessionStorage(
          customerAccountSessionKey
        );

        setCustomerAccount(null);
        setAuthenticationStatus("guest");

        setOrders([]);
        setLatestOrder(null);
        setPartnerApplication(null);

        removeStorage(storageKeys.orders);
        removeStorage(storageKeys.latestOrder);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        removeSessionStorage(
          customerAccountSessionKey
        );

        setCustomerAccount(null);
        setAuthenticationStatus("guest");

        setAuthenticationError(
          error.message ||
            "Secure account status could not be confirmed."
        );

        setOrders([]);
        setLatestOrder(null);
        setPartnerApplication(null);

        removeStorage(storageKeys.orders);
        removeStorage(storageKeys.latestOrder);
      }
    }

    restoreSecureSession();

    return () => {
      isMounted = false;
    };
  }, [
    refreshCustomerOrders,
    refreshPartnerApplication,
  ]);

  useEffect(() => {
    function handlePopState() {
      const route = getRouteFromLocation();

      setCurrentPage(route.page);

      setVerificationCode(
        route.verificationCode
      );

      if (route.product) {
        setSelectedProduct(
          route.product
        );

        writeStorage(
          storageKeys.selectedProduct,
          route.product
        );
      } else if (
        route.page ===
        "notFound"
      ) {
        setSelectedProduct(
          null
        );
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);

  useEffect(() => {
    const productRoute =
      readProductRoute(
        window.location.pathname
      );

    if (!productRoute) {
      return undefined;
    }

    const controller =
      new AbortController();

    fetchCatalogOverrides({
      signal:
        controller.signal,
    })
      .then((records) => {
        const product =
          getProductFromPathname(
            window.location.pathname,
            records
          );

        if (!product) {
          setCurrentPage(
            "notFound"
          );

          setSelectedProduct(
            null
          );

          return;
        }

        setSelectedProduct(
          product
        );

        setCurrentPage(
          "productDetails"
        );

        writeStorage(
          storageKeys.selectedProduct,
          product
        );
      })
      .catch((error) => {
        if (
          error?.name !==
          "AbortError"
        ) {
          console.info(
            "Using the static catalog for this product route."
          );
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    applyPageSeo({
      page:
        currentPage,

      product:
        currentPage ===
        "productDetails"
          ? selectedProduct
          : null,

      pathname:
        window.location.pathname,
    });
  }, [
    currentPage,
    selectedProduct,
    verificationCode,
  ]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [currentPage]);

  useEffect(() => {
    writeStorage(
      storageKeys.cartItems,
      cartItems
    );
  }, [cartItems]);

  useEffect(() => {
    writeStorage(
      storageKeys.orders,
      orders
    );
  }, [orders]);

  useEffect(() => {
    writeStorage(
      storageKeys.latestOrder,
      latestOrder
    );
  }, [latestOrder]);

  useEffect(() => {
    writeStorage(
      storageKeys.selectedProduct,
      selectedProduct
    );
  }, [selectedProduct]);

  useEffect(() => {
    if (
      currentPage !== "productDetails" ||
      selectedProduct
    ) {
      return;
    }

    setCurrentPage("products");

    window.history.replaceState(
      {
        page: "products",
      },
      "",
      pagePaths.products
    );
  }, [
    currentPage,
    selectedProduct,
  ]);

  useEffect(() => {
    if (isAuthChecking) {
      return;
    }

    if (
      customerProtectedPages.has(currentPage) &&
      !isLoggedIn
    ) {
      goToPage("login", {
        replace: true,
      });

      return;
    }

    if (
      isLoggedIn &&
      [
        "login",
        "createAccount",
      ].includes(currentPage)
    ) {
      goToPage("dashboard", {
        replace: true,
      });
    }
  }, [
    currentPage,
    goToPage,
    isAuthChecking,
    isLoggedIn,
  ]);

  function handleAcceptAgeGate() {
    writeBooleanStorage(
      storageKeys.ageGateAccepted,
      true
    );

    setAgeGateAccepted(true);
  }

  async function handleResetPrototypeData() {
    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",

          headers: {
            Accept: "application/json",
          },

          credentials: "same-origin",
        }
      );
    } catch {
      // Local data still clears if logout is unavailable.
    }

    Object.values(storageKeys).forEach(
      removeStorage
    );

    removeStorage(
      legacyLoginStorageKey
    );

    removeSessionStorage(
      customerAccountSessionKey
    );

    setAgeGateAccepted(false);
    setAuthenticationStatus("guest");
    setCustomerAccount(null);
    setAuthenticationError("");

    setCartItems([]);
    setOrders([]);
    setLatestOrder(null);
    setPartnerApplication(null);
    setSelectedProduct(null);

    goToPage("home");
  }

  function handleProductSelect(product) {
    setSelectedProduct(product);

    writeStorage(
      storageKeys.selectedProduct,
      product
    );

    goToPage(
      "productDetails",
      {
        product,
      }
    );
  }

  function handleAddToCart(product) {
    const availability =
      product?.availability || {
        key: "in_stock",
        label: "In Stock",
        purchasable: true,
      };

    if (availability.purchasable === false) {
      setCartNotice({
        type: "error",
        title: "Item not added",
        message: `${product?.name || "This item"} is currently ${
          availability.label || "unavailable"
        }.`,
      });
      return;
    }

    const productKey = getCartItemKey(product);

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => getCartItemKey(item) === productKey
      );
      const existingQuantity = Number(existingItem?.quantity || 0);
      const nextQuantity = existingQuantity + 1;
      const availableQuantity = Math.max(
        0,
        Math.floor(Number(product?.quantity || 0))
      );

      if (
        product?.trackQuantity === true &&
        availability.key === "in_stock" &&
        nextQuantity > availableQuantity
      ) {
        setCartNotice({
          type: "error",
          title: "Stock limit reached",
          message: `Only ${availableQuantity} unit${
            availableQuantity === 1 ? " is" : "s are"
          } currently available.`,
        });
        return currentItems;
      }

      const nextItems = existingItem
        ? currentItems.map((item) =>
            getCartItemKey(item) === productKey
              ? {
                  ...item,
                  ...product,
                  quantity: nextQuantity,
                }
              : item
          )
        : [
            ...currentItems,
            {
              ...product,
              quantity: 1,
            },
          ];

      writeStorage(storageKeys.cartItems, nextItems);

      setCartNotice({
        type: "success",
        title: "Added to cart",
        message: `${product?.name || "Product"}${
          product?.strength ? ` · ${product.strength}` : ""
        } was added.`,
      });

      return nextItems;
    });
  }

  function handleIncreaseQuantity(itemKey) {
    setCartItems((currentItems) => {
      const nextItems = currentItems.map(
        (item) =>
          getCartItemKey(item) === itemKey
            ? {
                ...item,

                quantity:
                  Number(
                    item.quantity || 0
                  ) + 1,
              }
            : item
      );

      writeStorage(
        storageKeys.cartItems,
        nextItems
      );

      return nextItems;
    });
  }

  function handleDecreaseQuantity(itemKey) {
    setCartItems((currentItems) => {
      const nextItems = currentItems
        .map((item) =>
          getCartItemKey(item) === itemKey
            ? {
                ...item,

                quantity:
                  Number(
                    item.quantity || 0
                  ) - 1,
              }
            : item
        )
        .filter(
          (item) =>
            Number(item.quantity) > 0
        );

      writeStorage(
        storageKeys.cartItems,
        nextItems
      );

      return nextItems;
    });
  }

  function handleRemoveItem(itemKey) {
    setCartItems((currentItems) => {
      const nextItems = currentItems.filter(
        (item) =>
          getCartItemKey(item) !== itemKey
      );

      writeStorage(
        storageKeys.cartItems,
        nextItems
      );

      return nextItems;
    });
  }

  function handleClearCart() {
    setCartItems([]);

    writeStorage(
      storageKeys.cartItems,
      []
    );
  }

  function handlePlaceOrder(
    orderInformation = {}
  ) {
    const suppliedItems = Array.isArray(
      orderInformation.items
    )
      ? orderInformation.items
      : [];

    const orderItems =
      suppliedItems.length > 0
        ? suppliedItems
        : cartItems;

    if (orderItems.length === 0) {
      goToPage("cart");
      return;
    }

    const orderId =
      orderInformation.orderId ||
      orderInformation.id ||
      createOrderId();

    const createdAt =
      orderInformation.createdAt ||
      new Date().toISOString();

    const customerData =
      orderInformation.customer || {};

    const order = {
      id: orderId,
      orderId,
      createdAt,

      date:
        orderInformation.date ||
        new Date(createdAt).toLocaleDateString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
          }
        ),

      status:
        orderInformation.status ||
        "Order Request Received",

      customer: {
        firstName:
          orderInformation.firstName ||
          customerData.firstName ||
          "",

        lastName:
          orderInformation.lastName ||
          customerData.lastName ||
          "",

        email:
          orderInformation.email ||
          customerData.email ||
          "",

        address:
          orderInformation.address ||
          customerData.address ||
          "",

        city:
          orderInformation.city ||
          customerData.city ||
          "",

        state:
          orderInformation.state ||
          customerData.state ||
          "",

        zip:
          orderInformation.zip ||
          customerData.zip ||
          "",
      },

      preferredPaymentMethod:
        orderInformation.preferredPaymentMethod ||
        "",

      preferredPaymentLabel:
        orderInformation.preferredPaymentLabel ||
        "",

      items: orderItems.map((item) => ({
        ...item,

        quantity:
          Number(item.quantity || 1),

        price:
          Number(item.price || 0),

        image:
          item.image || "",
      })),

      totalQuantity:
        orderInformation.totalQuantity ||
        calculateTotalQuantity(orderItems),

      subtotal:
        orderInformation.subtotal ??
        calculateSubtotal(orderItems),
    };

    setOrders((currentOrders) => {
      const duplicateExists =
        currentOrders.some(
          (existingOrder) =>
            String(
              existingOrder.orderId ||
                existingOrder.id
            ) === String(orderId)
        );

      const nextOrders = duplicateExists
        ? currentOrders.map(
            (existingOrder) =>
              String(
                existingOrder.orderId ||
                  existingOrder.id
              ) === String(orderId)
                ? order
                : existingOrder
          )
        : [
            order,
            ...currentOrders,
          ];

      writeStorage(
        storageKeys.orders,
        nextOrders
      );

      return nextOrders;
    });

    setLatestOrder(order);

    writeStorage(
      storageKeys.latestOrder,
      order
    );

    setCartItems([]);

    writeStorage(
      storageKeys.cartItems,
      []
    );

    goToPage("orderConfirmation");
  }

  async function handlePartnerApplicationSubmit() {
    try {
      await refreshPartnerApplication();
    } catch (error) {
      console.error(
        "Submitted partner application could not be refreshed:",
        error
      );
    } finally {
      goToPage("dashboard");
    }
  }

  function renderPage() {
    if (
      isAuthChecking &&
      (
        customerProtectedPages.has(
          currentPage
        ) ||
        [
          "login",
          "createAccount",
        ].includes(currentPage)
      )
    ) {
      return (
        <AccountSessionLoading
          onNavigate={goToPage}
        />
      );
    }

    if (
      customerProtectedPages.has(
        currentPage
      ) &&
      !isLoggedIn
    ) {
      return (
        <Login
          onNavigate={goToPage}
          onLogin={handleLogin}
        />
      );
    }

    switch (currentPage) {
      case "home":
        return (
          <Home
            onNavigate={goToPage}
            onProductSelect={
              handleProductSelect
            }
            isLoggedIn={isLoggedIn}
            onAddToCart={handleAddToCart}
          />
        );

      case "products":
        return (
          <Products
            onProductSelect={
              handleProductSelect
            }
            isLoggedIn={isLoggedIn}
            onAddToCart={handleAddToCart}
          />
        );

      case "quality":
        return (
          <Quality
            onNavigate={goToPage}
          />
        );

      case "partners":
        return (
          <ResearchPartners
            onNavigate={goToPage}
          />
        );

      case "faq":
        return (
          <FAQ
            onNavigate={goToPage}
          />
        );

      case "contact":
        return (
          <Contact
            onNavigate={goToPage}
          />
        );

      case "researchAgreement":
        return (
          <ResearchAgreement
            onNavigate={goToPage}
          />
        );

      case "login":
        return (
          <Login
            onNavigate={goToPage}
            onLogin={handleLogin}
          />
        );

      case "createAccount":
        return (
          <CreateAccount
            onNavigate={goToPage}
            onLogin={handleLogin}
          />
        );

      case "dashboard":
        return (
          <CustomerDashboard
            onNavigate={goToPage}
            orders={orders}
            account={customerAccount}
            authenticationError={
              authenticationError
            }
            onRefreshOrders={
              refreshCustomerOrders
            }
            partnerApplication={
              partnerApplication
            }
          />
        );

      case "changePassword":
        return (
          <ChangePassword
            account={customerAccount}
            onNavigate={goToPage}
            onPasswordChanged={
              handlePasswordChanged
            }
          />
        );

      case "partnerApplication":
        return (
          <PartnerApplication
            onNavigate={goToPage}
            onSubmitApplication={
              handlePartnerApplicationSubmit
            }
          />
        );

      case "partnerHQ":
        return (
          <PartnerHQ
            onNavigate={goToPage}
            partnerApplication={
              partnerApplication
            }
          />
        );

      case "marketingCenter":
        return (
          <MarketingCenter
            onNavigate={goToPage}
            partnerApplication={
              partnerApplication
            }
          />
        );

      case "missionControl":
        return (
          <MissionControl
            orders={orders}
            partnerApplication={
              partnerApplication
            }
            onNavigate={goToPage}
            onResetPrototypeData={
              handleResetPrototypeData
            }
          />
        );

      case "orderManager":
        return (
          <AdminPlaceholder
            eyebrow="ORDER OPERATIONS"
            title="Orders"
            description="The dedicated order-management page is being separated from Customer Manager next. Your existing invoice, payment, partial-shipment, tracking, and email automation remains unchanged."
          />
        );

      case "affiliateManager":
        return (
          <AdminPlaceholder
            eyebrow="AFFILIATE PROGRAM"
            title="Affiliate Accounts"
            description="Affiliate applications, active accounts, referral codes, commissions, payouts, and rewards will be managed here."
          />
        );

      case "inventoryManager":
        return (
          <AdminPlaceholder
            eyebrow="STORE OPERATIONS"
            title="Inventory"
            description="Inventory quantities, preorder availability, incoming stock, and low-stock alerts will be managed here."
          />
        );

      case "accountingManager":
        return (
          <AdminPlaceholder
            eyebrow="BUSINESS OPERATIONS"
            title="Accounting"
            description="Sales totals, payments, expenses, affiliate commissions, and reporting will be organized here."
          />
        );

      case "productManager":
        return (
          <ProductManager
            onNavigate={goToPage}
          />
        );

      case "couponManager":
        return (
          <CouponManager
            onNavigate={goToPage}
          />
        );

      case "vialLabelGenerator":
        return (
          <VialLabelGenerator
            onNavigate={goToPage}
          />
        );

      case "shippingCenter":
        return (
          <ShippingCenter
            onNavigate={goToPage}
          />
        );

      case "coaManager":
        return (
          <COAManager
            onNavigate={goToPage}
          />
        );

      case "qrManager":
        return (
          <QRManager
            onNavigate={goToPage}
            onOpenVerification={(code) =>
              goToPage(
                "verification",
                {
                  code,
                }
              )
            }
          />
        );

      case "verification":
        return (
          <VerificationRecord
            code={verificationCode}
            onNavigate={goToPage}
          />
        );

      case "customerManager":
        return (
          <CustomerManager
            orders={orders}
            partnerApplication={
              partnerApplication
            }
            onNavigate={goToPage}
          />
        );

      case "siteSettings":
        return (
          <SiteSettings
            onNavigate={goToPage}
          />
        );

      case "launchChecklist":
        return (
          <LaunchChecklist
            onNavigate={goToPage}
          />
        );

      case "cart":
        return (
          <Cart
            cartItems={cartItems}
            onNavigate={goToPage}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onIncreaseQuantity={
              handleIncreaseQuantity
            }
            onDecreaseQuantity={
              handleDecreaseQuantity
            }
          />
        );

      case "checkout":
        return (
          <Checkout
            cartItems={cartItems}
            onNavigate={goToPage}
            onPlaceOrder={handlePlaceOrder}
          />
        );

      case "orderConfirmation":
        return (
          <OrderConfirmation
            onNavigate={goToPage}
            latestOrder={latestOrder}
          />
        );

      case "productDetails":
        return selectedProduct ? (
          <ProductDetails
            product={selectedProduct}
            onBack={() =>
              goToPage("products")
            }
            onNavigate={goToPage}
            isLoggedIn={isLoggedIn}
            onAddToCart={handleAddToCart}
          />
        ) : (
          <Products
            onProductSelect={
              handleProductSelect
            }
            isLoggedIn={isLoggedIn}
            onAddToCart={handleAddToCart}
          />
        );

      case "notFound":
        return (
          <NotFoundPage
            onNavigate={
              goToPage
            }
          />
        );

      default:
        return (
          <NotFoundPage
            onNavigate={
              goToPage
            }
          />
        );
    }
  }

  const isAdminPage = ADMIN_PAGES.has(currentPage);
  const pageContent = (
    <Suspense
      fallback={
        <PageLoading />
      }
    >
      {renderPage()}
    </Suspense>
  );

  return (
    <>
      {!isAdminPage && !ageGateAccepted && (
        <AgeGate
          onAccept={handleAcceptAgeGate}
        />
      )}

      {!isAdminPage && (
        <>
          <SiteAlert />

          <Navbar
            currentPage={currentPage}
            onNavigate={goToPage}
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
            cartCount={cartCount}
          />

          {cartNotice && (
            <CartNotice
              notice={cartNotice}
              onClose={() => setCartNotice(null)}
              onViewCart={() => {
                setCartNotice(null);
                goToPage("cart");
              }}
            />
          )}
        </>
      )}

      {isAdminPage ? (
        <AdminLayout
          activePage={currentPage}
          onNavigate={goToPage}
          showHeading={false}
        >
          {pageContent}
        </AdminLayout>
      ) : (
        pageContent
      )}

      {!isAdminPage && (
        <Footer
          onNavigate={goToPage}
        />
      )}
    </>
  );
}

function PageLoading() {
  return (
    <main
      aria-live="polite"
      aria-busy="true"
      style={{
        minHeight:
          "58vh",

        display:
          "grid",

        placeItems:
          "center",

        padding:
          "100px 24px",
      }}
    >
      <div
        style={{
          display:
            "grid",

          justifyItems:
            "center",

          gap:
            "16px",

          padding:
            "30px 36px",

          border:
            "1px solid rgba(255,255,255,0.09)",

          borderRadius:
            "24px",

          background:
            "radial-gradient(circle at top, rgba(61,165,255,0.16), transparent 48%), rgba(255,255,255,0.035)",

          boxShadow:
            "0 24px 70px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width:
              "42px",

            height:
              "42px",

            border:
              "4px solid rgba(255,255,255,0.14)",

            borderTopColor:
              "#3da5ff",

            borderRadius:
              "50%",

            animation:
              "page-loading-spin 0.8s linear infinite",
          }}
        />

        <strong
          style={{
            color:
              "#ffffff",

            fontSize:
              "15px",

            letterSpacing:
              "0.08em",

            textTransform:
              "uppercase",
          }}
        >
          Loading 304 Peptides
        </strong>

        <style>
          {`
            @keyframes page-loading-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              div[aria-busy="true"] div {
                animation-duration: 1.8s !important;
              }
            }
          `}
        </style>
      </div>
    </main>
  );
}

function NotFoundPage({
  onNavigate = () => {},
}) {
  return (
    <main
      style={{
        minHeight: "65vh",
        display: "grid",
        placeItems: "center",
        padding: "110px 24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "720px",
          padding: "44px",

          border:
            "1px solid rgba(255,255,255,0.09)",

          borderRadius:
            "28px",

          background:
            "radial-gradient(circle at top, rgba(61,165,255,0.16), transparent 42%), rgba(255,255,255,0.035)",

          boxShadow:
            "0 30px 80px rgba(0,0,0,0.45)",

          textAlign:
            "center",
        }}
      >
        <p className="eyebrow">
          ERROR 404
        </p>

        <h1
          style={{
            margin:
              "8px 0 16px",

            color:
              "#ffffff",

            fontSize:
              "clamp(38px, 7vw, 58px)",

            lineHeight:
              1.05,
          }}
        >
          Page Not Found
        </h1>

        <p
          style={{
            margin:
              "0 auto",

            maxWidth:
              "560px",

            color:
              "#c8c8c8",

            lineHeight:
              1.75,
          }}
        >
          The page or product you requested
          could not be found. It may have moved,
          changed, or no longer be available.
        </p>

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "center",

            flexWrap:
              "wrap",

            gap:
              "12px",

            marginTop:
              "26px",
          }}
        >
          <button
            type="button"
            className="primary-btn"

            onClick={() =>
              onNavigate(
                "products"
              )
            }
          >
            Browse Products
          </button>

          <button
            type="button"
            className="secondary-btn"

            onClick={() =>
              onNavigate(
                "home"
              )
            }
          >
            Return Home
          </button>
        </div>
      </section>
    </main>
  );
}

function AdminPlaceholder({
  eyebrow,
  title,
  description,
}) {
  return (
    <section
      style={{
        width: "min(1100px, 100%)",
        margin: "0 auto",
        padding: "38px",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "26px",
        background:
          "radial-gradient(circle at top right, rgba(61,165,255,0.14), transparent 35%), rgba(255,255,255,0.035)",
        boxShadow: "0 28px 80px rgba(0,0,0,0.34)",
      }}
    >
      <p className="eyebrow">{eyebrow}</p>

      <h1
        style={{
          margin: "8px 0 14px",
          color: "#ffffff",
          fontSize: "clamp(34px, 6vw, 56px)",
          lineHeight: 1.05,
        }}
      >
        {title}
      </h1>

      <p
        style={{
          maxWidth: "760px",
          margin: 0,
          color: "#b9c4ce",
          lineHeight: 1.75,
          fontSize: "1rem",
        }}
      >
        {description}
      </p>
    </section>
  );
}

function CartNotice({
  notice,
  onClose,
  onViewCart,
}) {
  return (
    <aside
      aria-live="polite"
      style={{
        position: "fixed",
        zIndex: 1200,
        right: "18px",
        top: "88px",
        width: "min(390px, calc(100vw - 36px))",
        padding: "18px",
        borderRadius: "18px",
        border:
          notice.type === "error"
            ? "1px solid rgba(255,95,95,.48)"
            : "1px solid rgba(80,211,145,.42)",
        background:
          notice.type === "error"
            ? "linear-gradient(145deg, rgba(91,25,31,.98), rgba(22,15,18,.98))"
            : "linear-gradient(145deg, rgba(18,67,48,.98), rgba(12,20,18,.98))",
        color: "#fff",
        boxShadow: "0 24px 70px rgba(0,0,0,.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          alignItems: "flex-start",
        }}
      >
        <div>
          <strong style={{ fontSize: "18px", display: "block" }}>
            {notice.title}
          </strong>

          <span
            style={{
              display: "block",
              marginTop: "6px",
              color: "rgba(255,255,255,.78)",
              lineHeight: 1.5,
            }}
          >
            {notice.message}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart message"
          style={{
            border: 0,
            background: "rgba(255,255,255,.1)",
            color: "#fff",
            borderRadius: "10px",
            width: "34px",
            height: "34px",
            cursor: "pointer",
            fontSize: "20px",
          }}
        >
          ×
        </button>
      </div>

      {notice.type !== "error" && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "9px",
            marginTop: "15px",
          }}
        >
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
          >
            Continue Shopping
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={onViewCart}
          >
            View Cart
          </button>
        </div>
      )}
    </aside>
  );
}

function AccountSessionLoading({
  onNavigate = () => {},
}) {
  return (
    <main
      style={{
        minHeight: "65vh",
        display: "grid",
        placeItems: "center",
        padding: "100px 24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "680px",
          padding: "42px",
          border:
            "1px solid rgba(255,255,255,0.09)",
          borderRadius: "28px",
          background:
            "radial-gradient(circle at top, rgba(61,165,255,0.18), transparent 42%), rgba(255,255,255,0.035)",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.45)",
          textAlign: "center",
        }}
      >
        <p className="eyebrow">
          SECURE ACCOUNT
        </p>

        <h1
          style={{
            marginBottom: "16px",
            color: "#ffffff",
            fontSize:
              "clamp(34px, 6vw, 48px)",
          }}
        >
          Checking Your Session
        </h1>

        <p
          style={{
            color: "#c8c8c8",
            lineHeight: 1.75,
          }}
        >
          Confirming your secure account and
          loading account-linked order records.
        </p>

        <button
          type="button"
          className="secondary-btn"
          style={{
            marginTop: "24px",
          }}
          onClick={() =>
            onNavigate("home")
          }
        >
          Return Home
        </button>
      </section>
    </main>
  );
}

export default App;