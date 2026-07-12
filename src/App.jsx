import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./index.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AgeGate from "./components/AgeGate";
import SiteAlert from "./components/SiteAlert";

import Home from "./pages/Home";
import Products from "./pages/Products";
import Quality from "./pages/Quality";
import ResearchPartners from "./pages/ResearchPartners";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import ProductDetails from "./pages/ProductDetails";
import CustomerDashboard from "./pages/CustomerDashboard";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import PartnerApplication from "./pages/PartnerApplication";
import PartnerHQ from "./pages/PartnerHQ";
import MarketingCenter from "./pages/MarketingCenter";
import MissionControl from "./pages/MissionControl";
import ProductManager from "./pages/ProductManager";
import COAManager from "./pages/COAManager";
import CustomerManager from "./pages/CustomerManager";
import SiteSettings from "./pages/SiteSettings";
import LaunchChecklist from "./pages/LaunchChecklist";
import ResearchAgreement from "./pages/ResearchAgreement";
import QRManager from "./pages/QRManager";
import VerificationRecord from "./pages/VerificationRecord";

const storageKeys = {
  ageGateAccepted:
    "ageGateAccepted",

  isLoggedIn:
    "isLoggedIn",

  cartItems:
    "cartItems",

  orders:
    "orders",

  latestOrder:
    "latestOrder",

  selectedProduct:
    "selectedProduct",

  partnerApplication:
    "partnerApplication",
};

const pagePaths = {
  home: "/",

  products:
    "/products",

  quality:
    "/quality",

  partners:
    "/partners",

  faq:
    "/faq",

  contact:
    "/contact",

  researchAgreement:
    "/research-agreement",

  login:
    "/login",

  createAccount:
    "/create-account",

  dashboard:
    "/dashboard",

  partnerApplication:
    "/partner-application",

  partnerHQ:
    "/admin/partner-hq",

  marketingCenter:
    "/admin/marketing",

  missionControl:
    "/admin",

  productManager:
    "/admin/products",

  coaManager:
    "/admin/coa",

  qrManager:
    "/admin/qr",

  customerManager:
    "/admin/customers",

  siteSettings:
    "/admin/settings",

  launchChecklist:
    "/admin/launch-checklist",

  cart:
    "/cart",

  checkout:
    "/checkout",

  orderConfirmation:
    "/order-confirmation",

  productDetails:
    "/product-details",
};

function readStorage(
  key,
  fallbackValue
) {
  try {
    const savedValue =
      window.localStorage.getItem(
        key
      );

    if (
      savedValue === null
    ) {
      return fallbackValue;
    }

    return JSON.parse(
      savedValue
    );
  } catch {
    return fallbackValue;
  }
}

function readBooleanStorage(
  key,
  fallbackValue = false
) {
  try {
    const savedValue =
      window.localStorage.getItem(
        key
      );

    if (
      savedValue === null
    ) {
      return fallbackValue;
    }

    return (
      savedValue ===
      "true"
    );
  } catch {
    return fallbackValue;
  }
}

function writeStorage(
  key,
  value
) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(
        value
      )
    );

    return true;
  } catch {
    return false;
  }
}

function writeBooleanStorage(
  key,
  value
) {
  try {
    window.localStorage.setItem(
      key,
      value
        ? "true"
        : "false"
    );

    return true;
  } catch {
    return false;
  }
}

function removeStorage(
  key
) {
  try {
    window.localStorage.removeItem(
      key
    );
  } catch {
    // Storage may be blocked.
  }
}

function getCartItemKey(
  item
) {
  return `${item.codeName || ""}-${item.strength || ""}`;
}

function getRouteFromLocation() {
  const pathname =
    window.location.pathname.replace(
      /\/+$/,
      ""
    ) || "/";

  if (
    pathname.startsWith(
      "/verify/"
    )
  ) {
    const encodedCode =
      pathname.slice(
        "/verify/".length
      );

    let code =
      encodedCode;

    try {
      code =
        decodeURIComponent(
          encodedCode
        );
    } catch {
      code =
        encodedCode;
    }

    return {
      page:
        "verification",

      verificationCode:
        code,
    };
  }

  const matchingEntry =
    Object.entries(
      pagePaths
    ).find(
      (
        [
          ,
          path,
        ]
      ) =>
        path ===
        pathname
    );

  if (
    matchingEntry
  ) {
    return {
      page:
        matchingEntry[0],

      verificationCode:
        "",
    };
  }

  return {
    page:
      "home",

    verificationCode:
      "",
  };
}

function getPagePath(
  page,
  verificationCode = ""
) {
  if (
    page ===
    "verification"
  ) {
    return verificationCode
      ? `/verify/${encodeURIComponent(
          verificationCode
        )}`
      : "/";
  }

  return (
    pagePaths[
      page
    ] || "/"
  );
}

function calculateTotalQuantity(
  items
) {
  return items.reduce(
    (
      total,
      item
    ) =>
      total +
      Number(
        item.quantity ||
          0
      ),
    0
  );
}

function calculateSubtotal(
  items
) {
  return items.reduce(
    (
      total,
      item
    ) =>
      total +
      Number(
        item.price ||
          0
      ) *
        Number(
          item.quantity ||
            0
        ),
    0
  );
}

function createOrderId() {
  return `304-${Date.now()
    .toString()
    .slice(-8)}`;
}

function App() {
  const initialRoute =
    useMemo(
      getRouteFromLocation,
      []
    );

  const [
    ageGateAccepted,
    setAgeGateAccepted,
  ] = useState(
    () =>
      readBooleanStorage(
        storageKeys.ageGateAccepted
      )
  );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(
    initialRoute.page
  );

  const [
    verificationCode,
    setVerificationCode,
  ] = useState(
    initialRoute.verificationCode
  );

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(
    () =>
      readStorage(
        storageKeys.selectedProduct,
        null
      )
  );

  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(
    () =>
      readBooleanStorage(
        storageKeys.isLoggedIn
      )
  );

  const [
    cartItems,
    setCartItems,
  ] = useState(
    () => {
      const savedItems =
        readStorage(
          storageKeys.cartItems,
          []
        );

      return Array.isArray(
        savedItems
      )
        ? savedItems
        : [];
    }
  );

  const [
    orders,
    setOrders,
  ] = useState(
    () => {
      const savedOrders =
        readStorage(
          storageKeys.orders,
          []
        );

      return Array.isArray(
        savedOrders
      )
        ? savedOrders
        : [];
    }
  );

  const [
    latestOrder,
    setLatestOrder,
  ] = useState(
    () =>
      readStorage(
        storageKeys.latestOrder,
        null
      )
  );

  const [
    partnerApplication,
    setPartnerApplication,
  ] = useState(
    () =>
      readStorage(
        storageKeys.partnerApplication,
        null
      )
  );

  const cartCount =
    useMemo(
      () =>
        calculateTotalQuantity(
          cartItems
        ),
      [
        cartItems,
      ]
    );

  useEffect(() => {
    function handlePopState() {
      const route =
        getRouteFromLocation();

      setCurrentPage(
        route.page
      );

      setVerificationCode(
        route.verificationCode
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
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
    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }, [
    currentPage,
  ]);

  useEffect(() => {
    writeBooleanStorage(
      storageKeys.isLoggedIn,
      isLoggedIn
    );
  }, [
    isLoggedIn,
  ]);

  useEffect(() => {
    writeStorage(
      storageKeys.cartItems,
      cartItems
    );
  }, [
    cartItems,
  ]);

  useEffect(() => {
    writeStorage(
      storageKeys.orders,
      orders
    );
  }, [
    orders,
  ]);

  useEffect(() => {
    writeStorage(
      storageKeys.latestOrder,
      latestOrder
    );
  }, [
    latestOrder,
  ]);

  useEffect(() => {
    writeStorage(
      storageKeys.selectedProduct,
      selectedProduct
    );
  }, [
    selectedProduct,
  ]);

  useEffect(() => {
    writeStorage(
      storageKeys.partnerApplication,
      partnerApplication
    );
  }, [
    partnerApplication,
  ]);

  useEffect(() => {
    if (
      currentPage !==
        "productDetails" ||
      selectedProduct
    ) {
      return;
    }

    setCurrentPage(
      "products"
    );

    window.history.replaceState(
      {
        page:
          "products",
      },
      "",
      pagePaths.products
    );
  }, [
    currentPage,
    selectedProduct,
  ]);

  function handleAcceptAgeGate() {
    writeBooleanStorage(
      storageKeys.ageGateAccepted,
      true
    );

    setAgeGateAccepted(
      true
    );
  }

  function goToPage(
    page,
    options = {}
  ) {
    const suppliedCode =
      typeof options ===
      "string"
        ? options
        : options.code ||
          "";

    const replaceHistory =
      typeof options ===
        "object" &&
      Boolean(
        options.replace
      );

    if (
      page ===
      "verification"
    ) {
      setVerificationCode(
        suppliedCode
      );
    } else {
      setVerificationCode(
        ""
      );
    }

    setCurrentPage(
      page
    );

    const path =
      getPagePath(
        page,
        suppliedCode
      );

    const currentPath =
      window.location.pathname;

    if (
      currentPath !==
      path
    ) {
      const historyMethod =
        replaceHistory
          ? "replaceState"
          : "pushState";

      window.history[
        historyMethod
      ](
        {
          page,
          verificationCode:
            suppliedCode,
        },
        "",
        path
      );
    }

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  function handleResetPrototypeData() {
    Object.values(
      storageKeys
    ).forEach(
      removeStorage
    );

    setAgeGateAccepted(
      false
    );

    setIsLoggedIn(
      false
    );

    setCartItems(
      []
    );

    setOrders(
      []
    );

    setLatestOrder(
      null
    );

    setPartnerApplication(
      null
    );

    setSelectedProduct(
      null
    );

    goToPage(
      "home"
    );
  }

  function handleProductSelect(
    product
  ) {
    setSelectedProduct(
      product
    );

    writeStorage(
      storageKeys.selectedProduct,
      product
    );

    goToPage(
      "productDetails"
    );
  }

  function handleAddToCart(
    product
  ) {
    const productKey =
      getCartItemKey(
        product
      );

    setCartItems(
      (
        currentItems
      ) => {
        const existingItem =
          currentItems.find(
            (
              item
            ) =>
              getCartItemKey(
                item
              ) ===
              productKey
          );

        let nextItems;

        if (
          existingItem
        ) {
          nextItems =
            currentItems.map(
              (
                item
              ) =>
                getCartItemKey(
                  item
                ) ===
                productKey
                  ? {
                      ...item,

                      quantity:
                        Number(
                          item.quantity ||
                            0
                        ) +
                        1,
                    }
                  : item
            );
        } else {
          nextItems = [
            ...currentItems,

            {
              ...product,
              quantity:
                1,
            },
          ];
        }

        writeStorage(
          storageKeys.cartItems,
          nextItems
        );

        return nextItems;
      }
    );

    goToPage(
      "cart"
    );
  }

  function handleIncreaseQuantity(
    itemKey
  ) {
    setCartItems(
      (
        currentItems
      ) => {
        const nextItems =
          currentItems.map(
            (
              item
            ) =>
              getCartItemKey(
                item
              ) ===
              itemKey
                ? {
                    ...item,

                    quantity:
                      Number(
                        item.quantity ||
                          0
                      ) +
                      1,
                  }
                : item
          );

        writeStorage(
          storageKeys.cartItems,
          nextItems
        );

        return nextItems;
      }
    );
  }

  function handleDecreaseQuantity(
    itemKey
  ) {
    setCartItems(
      (
        currentItems
      ) => {
        const nextItems =
          currentItems
            .map(
              (
                item
              ) =>
                getCartItemKey(
                  item
                ) ===
                itemKey
                  ? {
                      ...item,

                      quantity:
                        Number(
                          item.quantity ||
                            0
                        ) -
                        1,
                    }
                  : item
            )
            .filter(
              (
                item
              ) =>
                Number(
                  item.quantity
                ) >
                0
            );

        writeStorage(
          storageKeys.cartItems,
          nextItems
        );

        return nextItems;
      }
    );
  }

  function handleRemoveItem(
    itemKey
  ) {
    setCartItems(
      (
        currentItems
      ) => {
        const nextItems =
          currentItems.filter(
            (
              item
            ) =>
              getCartItemKey(
                item
              ) !==
              itemKey
          );

        writeStorage(
          storageKeys.cartItems,
          nextItems
        );

        return nextItems;
      }
    );
  }

  function handleClearCart() {
    setCartItems(
      []
    );

    writeStorage(
      storageKeys.cartItems,
      []
    );
  }

  function handlePlaceOrder(
    orderInformation = {}
  ) {
    const suppliedItems =
      Array.isArray(
        orderInformation.items
      )
        ? orderInformation.items
        : [];

    const orderItems =
      suppliedItems.length >
      0
        ? suppliedItems
        : cartItems;

    if (
      orderItems.length ===
      0
    ) {
      goToPage(
        "cart"
      );

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
      orderInformation.customer ||
      {};

    const order = {
      id:
        orderId,

      orderId,

      createdAt,

      date:
        orderInformation.date ||
        new Date(
          createdAt
        ).toLocaleDateString(
          "en-US",
          {
            month:
              "long",

            day:
              "numeric",

            year:
              "numeric",
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

      items:
        orderItems.map(
          (
            item
          ) => ({
            ...item,

            quantity:
              Number(
                item.quantity ||
                  1
              ),

            price:
              Number(
                item.price ||
                  0
              ),

            image:
              item.image ||
              "",
          })
        ),

      totalQuantity:
        calculateTotalQuantity(
          orderItems
        ),

      subtotal:
        calculateSubtotal(
          orderItems
        ),
    };

    setOrders(
      (
        currentOrders
      ) => {
        const duplicateExists =
          currentOrders.some(
            (
              existingOrder
            ) =>
              String(
                existingOrder.orderId ||
                  existingOrder.id
              ) ===
              String(
                orderId
              )
          );

        const nextOrders =
          duplicateExists
            ? currentOrders.map(
                (
                  existingOrder
                ) =>
                  String(
                    existingOrder.orderId ||
                      existingOrder.id
                  ) ===
                  String(
                    orderId
                  )
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
      }
    );

    setLatestOrder(
      order
    );

    writeStorage(
      storageKeys.latestOrder,
      order
    );

    setCartItems(
      []
    );

    writeStorage(
      storageKeys.cartItems,
      []
    );

    goToPage(
      "orderConfirmation"
    );
  }

  function handlePartnerApplicationSubmit(
    code
  ) {
    const application = {
      code,

      status:
        "Application Submitted",

      createdAt:
        new Date().toISOString(),

      date:
        new Date().toLocaleDateString(
          "en-US",
          {
            month:
              "long",

            day:
              "numeric",

            year:
              "numeric",
          }
        ),
    };

    setPartnerApplication(
      application
    );

    writeStorage(
      storageKeys.partnerApplication,
      application
    );

    goToPage(
      "dashboard"
    );
  }

  function handleLogin() {
    setIsLoggedIn(
      true
    );

    writeBooleanStorage(
      storageKeys.isLoggedIn,
      true
    );

    goToPage(
      "dashboard"
    );
  }

  function handleLogout() {
    setIsLoggedIn(
      false
    );

    writeBooleanStorage(
      storageKeys.isLoggedIn,
      false
    );

    setSelectedProduct(
      null
    );

    removeStorage(
      storageKeys.selectedProduct
    );

    setCartItems(
      []
    );

    writeStorage(
      storageKeys.cartItems,
      []
    );

    goToPage(
      "home"
    );
  }

  function renderPage() {
    switch (
      currentPage
    ) {
      case "home":
        return (
          <Home
            onNavigate={
              goToPage
            }
            onProductSelect={
              handleProductSelect
            }
            isLoggedIn={
              isLoggedIn
            }
            onAddToCart={
              handleAddToCart
            }
          />
        );

      case "products":
        return (
          <Products
            onProductSelect={
              handleProductSelect
            }
            isLoggedIn={
              isLoggedIn
            }
            onAddToCart={
              handleAddToCart
            }
          />
        );

      case "quality":
        return (
          <Quality
            onNavigate={
              goToPage
            }
          />
        );

      case "partners":
        return (
          <ResearchPartners
            onNavigate={
              goToPage
            }
          />
        );

      case "faq":
        return (
          <FAQ
            onNavigate={
              goToPage
            }
          />
        );

      case "contact":
        return (
          <Contact
            onNavigate={
              goToPage
            }
          />
        );

      case "researchAgreement":
        return (
          <ResearchAgreement
            onNavigate={
              goToPage
            }
          />
        );

      case "login":
        return (
          <Login
            onNavigate={
              goToPage
            }
            onLogin={
              handleLogin
            }
          />
        );

      case "createAccount":
        return (
          <CreateAccount
            onNavigate={
              goToPage
            }
            onLogin={
              handleLogin
            }
          />
        );

      case "dashboard":
        return (
          <CustomerDashboard
            onNavigate={
              goToPage
            }
            orders={
              orders
            }
            partnerApplication={
              partnerApplication
            }
          />
        );

      case "partnerApplication":
        return (
          <PartnerApplication
            onNavigate={
              goToPage
            }
            onSubmitApplication={
              handlePartnerApplicationSubmit
            }
          />
        );

      case "partnerHQ":
        return (
          <PartnerHQ
            onNavigate={
              goToPage
            }
            partnerApplication={
              partnerApplication
            }
          />
        );

      case "marketingCenter":
        return (
          <MarketingCenter
            onNavigate={
              goToPage
            }
            partnerApplication={
              partnerApplication
            }
          />
        );

      case "missionControl":
        return (
          <MissionControl
            orders={
              orders
            }
            partnerApplication={
              partnerApplication
            }
            onNavigate={
              goToPage
            }
            onResetPrototypeData={
              handleResetPrototypeData
            }
          />
        );

      case "productManager":
        return (
          <ProductManager
            onNavigate={
              goToPage
            }
          />
        );

      case "coaManager":
        return (
          <COAManager
            onNavigate={
              goToPage
            }
          />
        );

      case "qrManager":
        return (
          <QRManager
            onNavigate={
              goToPage
            }
            onOpenVerification={(
              code
            ) =>
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
            code={
              verificationCode
            }
            onNavigate={
              goToPage
            }
          />
        );

      case "customerManager":
        return (
          <CustomerManager
            orders={
              orders
            }
            partnerApplication={
              partnerApplication
            }
            onNavigate={
              goToPage
            }
          />
        );

      case "siteSettings":
        return (
          <SiteSettings
            onNavigate={
              goToPage
            }
          />
        );

      case "launchChecklist":
        return (
          <LaunchChecklist
            onNavigate={
              goToPage
            }
          />
        );

      case "cart":
        return (
          <Cart
            cartItems={
              cartItems
            }
            onNavigate={
              goToPage
            }
            onRemoveItem={
              handleRemoveItem
            }
            onClearCart={
              handleClearCart
            }
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
            cartItems={
              cartItems
            }
            onNavigate={
              goToPage
            }
            onPlaceOrder={
              handlePlaceOrder
            }
          />
        );

      case "orderConfirmation":
        return (
          <OrderConfirmation
            onNavigate={
              goToPage
            }
            latestOrder={
              latestOrder
            }
          />
        );

      case "productDetails":
        return selectedProduct ? (
          <ProductDetails
            product={
              selectedProduct
            }
            onBack={() =>
              goToPage(
                "products"
              )
            }
            onNavigate={
              goToPage
            }
            isLoggedIn={
              isLoggedIn
            }
            onAddToCart={
              handleAddToCart
            }
          />
        ) : (
          <Products
            onProductSelect={
              handleProductSelect
            }
            isLoggedIn={
              isLoggedIn
            }
            onAddToCart={
              handleAddToCart
            }
          />
        );

      default:
        return (
          <Home
            onNavigate={
              goToPage
            }
            onProductSelect={
              handleProductSelect
            }
            isLoggedIn={
              isLoggedIn
            }
            onAddToCart={
              handleAddToCart
            }
          />
        );
    }
  }

  return (
    <>
      {!ageGateAccepted && (
        <AgeGate
          onAccept={
            handleAcceptAgeGate
          }
        />
      )}

      <Navbar
        currentPage={
          currentPage
        }
        onNavigate={
          goToPage
        }
        isLoggedIn={
          isLoggedIn
        }
        onLogout={
          handleLogout
        }
        cartCount={
          cartCount
        }
      />

      <SiteAlert />

      {renderPage()}

      <Footer
        onNavigate={
          goToPage
        }
      />
    </>
  );
}

export default App;