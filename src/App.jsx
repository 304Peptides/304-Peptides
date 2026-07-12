import {
  useEffect,
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

const pagePaths = {
  home: "/",
  products: "/products",
  quality: "/quality",
  partners: "/partners",
  faq: "/faq",
  contact: "/contact",
  researchAgreement:
    "/research-agreement",
  login: "/login",
  createAccount:
    "/create-account",
  dashboard: "/dashboard",
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
  cart: "/cart",
  checkout: "/checkout",
  orderConfirmation:
    "/order-confirmation",
  productDetails:
    "/product-details",
};

function getSavedValue(
  key,
  fallbackValue
) {
  const savedValue =
    localStorage.getItem(
      key
    );

  if (!savedValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(
      savedValue
    );
  } catch {
    return fallbackValue;
  }
}

function getCartItemKey(
  item
) {
  return `${item.codeName}-${item.strength}`;
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
        [, path]
      ) =>
        path ===
        pathname
    );

  if (matchingEntry) {
    return {
      page:
        matchingEntry[0],

      verificationCode:
        "",
    };
  }

  return {
    page: "home",
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
    pagePaths[page] ||
    "/"
  );
}

function App() {
  const initialRoute =
    getRouteFromLocation();

  const [
    ageGateAccepted,
    setAgeGateAccepted,
  ] = useState(
    () =>
      localStorage.getItem(
        "ageGateAccepted"
      ) === "true"
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
  ] = useState(null);

  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(
    () =>
      localStorage.getItem(
        "isLoggedIn"
      ) === "true"
  );

  const [
    cartItems,
    setCartItems,
  ] = useState(
    () =>
      getSavedValue(
        "cartItems",
        []
      )
  );

  const [
    orders,
    setOrders,
  ] = useState(
    () =>
      getSavedValue(
        "orders",
        []
      )
  );

  const [
    latestOrder,
    setLatestOrder,
  ] = useState(
    () =>
      getSavedValue(
        "latestOrder",
        null
      )
  );

  const [
    partnerApplication,
    setPartnerApplication,
  ] = useState(
    () =>
      getSavedValue(
        "partnerApplication",
        null
      )
  );

  const cartCount =
    cartItems.reduce(
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
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem(
      "isLoggedIn",
      isLoggedIn
        ? "true"
        : "false"
    );
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem(
      "cartItems",
      JSON.stringify(
        cartItems
      )
    );
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(
      "orders",
      JSON.stringify(
        orders
      )
    );
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(
      "latestOrder",
      JSON.stringify(
        latestOrder
      )
    );
  }, [latestOrder]);

  useEffect(() => {
    localStorage.setItem(
      "partnerApplication",
      JSON.stringify(
        partnerApplication
      )
    );
  }, [
    partnerApplication,
  ]);

  function handleAcceptAgeGate() {
    localStorage.setItem(
      "ageGateAccepted",
      "true"
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

    if (
      page ===
      "verification"
    ) {
      setVerificationCode(
        suppliedCode
      );
    }

    setCurrentPage(page);

    const path =
      getPagePath(
        page,
        suppliedCode
      );

    const currentPath =
      window.location.pathname;

    if (
      currentPath !== path
    ) {
      window.history.pushState(
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
      behavior: "smooth",
    });
  }

  function handleResetPrototypeData() {
    localStorage.removeItem(
      "isLoggedIn"
    );

    localStorage.removeItem(
      "cartItems"
    );

    localStorage.removeItem(
      "orders"
    );

    localStorage.removeItem(
      "latestOrder"
    );

    localStorage.removeItem(
      "partnerApplication"
    );

    setIsLoggedIn(false);
    setCartItems([]);
    setOrders([]);
    setLatestOrder(null);

    setPartnerApplication(
      null
    );

    setSelectedProduct(
      null
    );

    goToPage("home");
  }

  function handleProductSelect(
    product
  ) {
    setSelectedProduct(
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
            (item) =>
              getCartItemKey(
                item
              ) ===
              productKey
          );

        if (existingItem) {
          return currentItems.map(
            (item) =>
              getCartItemKey(
                item
              ) ===
              productKey
                ? {
                    ...item,

                    quantity:
                      item.quantity +
                      1,
                  }
                : item
          );
        }

        return [
          ...currentItems,

          {
            ...product,
            quantity: 1,
          },
        ];
      }
    );

    goToPage("cart");
  }

  function handleIncreaseQuantity(
    itemKey
  ) {
    setCartItems(
      (
        currentItems
      ) =>
        currentItems.map(
          (item) =>
            getCartItemKey(
              item
            ) === itemKey
              ? {
                  ...item,

                  quantity:
                    item.quantity +
                    1,
                }
              : item
        )
    );
  }

  function handleDecreaseQuantity(
    itemKey
  ) {
    setCartItems(
      (
        currentItems
      ) =>
        currentItems
          .map(
            (item) =>
              getCartItemKey(
                item
              ) ===
              itemKey
                ? {
                    ...item,

                    quantity:
                      item.quantity -
                      1,
                  }
                : item
          )
          .filter(
            (item) =>
              item.quantity >
              0
          )
    );
  }

  function handleRemoveItem(
    itemKey
  ) {
    setCartItems(
      (
        currentItems
      ) =>
        currentItems.filter(
          (item) =>
            getCartItemKey(
              item
            ) !== itemKey
        )
    );
  }

  function handleClearCart() {
    setCartItems([]);
  }

  function handlePlaceOrder(
    orderInformation = {}
  ) {
    if (
      cartItems.length ===
      0
    ) {
      goToPage("cart");
      return;
    }

    const orderId =
      orderInformation.orderId ||
      orderInformation.id ||
      `304-${Date.now()
        .toString()
        .slice(-8)}`;

    const order = {
      id: orderId,
      orderId,

      date:
        new Date().toLocaleDateString(),

      status:
        orderInformation.status ||
        "Order Request Received",

      customer: {
        firstName:
          orderInformation.firstName ||
          "",

        lastName:
          orderInformation.lastName ||
          "",

        email:
          orderInformation.email ||
          "",

        address:
          orderInformation.address ||
          "",

        city:
          orderInformation.city ||
          "",

        state:
          orderInformation.state ||
          "",

        zip:
          orderInformation.zip ||
          "",
      },

      preferredPaymentMethod:
        orderInformation.preferredPaymentMethod ||
        "",

      preferredPaymentLabel:
        orderInformation.preferredPaymentLabel ||
        "",

      items:
        cartItems.map(
          (item) => ({
            ...item,
          })
        ),

      totalQuantity:
        cartItems.reduce(
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
        ),

      subtotal:
        cartItems.reduce(
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
        ),
    };

    setOrders(
      (
        currentOrders
      ) => [
        order,
        ...currentOrders,
      ]
    );

    setLatestOrder(
      order
    );

    setCartItems([]);

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

      date:
        new Date().toLocaleDateString(),
    };

    setPartnerApplication(
      application
    );

    goToPage(
      "dashboard"
    );
  }

  function handleLogin() {
    setIsLoggedIn(true);

    goToPage(
      "dashboard"
    );
  }

  function handleLogout() {
    setIsLoggedIn(false);

    setSelectedProduct(
      null
    );

    setCartItems([]);

    goToPage("home");
  }

  let pageToShow =
    null;

  if (
    currentPage === "home"
  ) {
    pageToShow = (
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

  if (
    currentPage ===
    "products"
  ) {
    pageToShow = (
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
  }

  if (
    currentPage ===
    "quality"
  ) {
    pageToShow = (
      <Quality
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage ===
    "partners"
  ) {
    pageToShow = (
      <ResearchPartners
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage === "faq"
  ) {
    pageToShow = (
      <FAQ
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage ===
    "contact"
  ) {
    pageToShow = (
      <Contact
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage ===
    "researchAgreement"
  ) {
    pageToShow = (
      <ResearchAgreement
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage ===
    "login"
  ) {
    pageToShow = (
      <Login
        onNavigate={
          goToPage
        }
        onLogin={
          handleLogin
        }
      />
    );
  }

  if (
    currentPage ===
    "createAccount"
  ) {
    pageToShow = (
      <CreateAccount
        onNavigate={
          goToPage
        }
        onLogin={
          handleLogin
        }
      />
    );
  }

  if (
    currentPage ===
    "dashboard"
  ) {
    pageToShow = (
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
  }

  if (
    currentPage ===
    "partnerApplication"
  ) {
    pageToShow = (
      <PartnerApplication
        onNavigate={
          goToPage
        }
        onSubmitApplication={
          handlePartnerApplicationSubmit
        }
      />
    );
  }

  if (
    currentPage ===
    "partnerHQ"
  ) {
    pageToShow = (
      <PartnerHQ
        onNavigate={
          goToPage
        }
        partnerApplication={
          partnerApplication
        }
      />
    );
  }

  if (
    currentPage ===
    "marketingCenter"
  ) {
    pageToShow = (
      <MarketingCenter
        onNavigate={
          goToPage
        }
        partnerApplication={
          partnerApplication
        }
      />
    );
  }

  if (
    currentPage ===
    "missionControl"
  ) {
    pageToShow = (
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
  }

  if (
    currentPage ===
    "productManager"
  ) {
    pageToShow = (
      <ProductManager
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage ===
    "coaManager"
  ) {
    pageToShow = (
      <COAManager
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage ===
    "qrManager"
  ) {
    pageToShow = (
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
  }

  if (
    currentPage ===
    "verification"
  ) {
    pageToShow = (
      <VerificationRecord
        code={
          verificationCode
        }
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage ===
    "customerManager"
  ) {
    pageToShow = (
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
  }

  if (
    currentPage ===
    "siteSettings"
  ) {
    pageToShow = (
      <SiteSettings
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage ===
    "launchChecklist"
  ) {
    pageToShow = (
      <LaunchChecklist
        onNavigate={
          goToPage
        }
      />
    );
  }

  if (
    currentPage ===
    "cart"
  ) {
    pageToShow = (
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
  }

  if (
    currentPage ===
    "checkout"
  ) {
    pageToShow = (
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
  }

  if (
    currentPage ===
    "orderConfirmation"
  ) {
    pageToShow = (
      <OrderConfirmation
        onNavigate={
          goToPage
        }
        latestOrder={
          latestOrder
        }
      />
    );
  }

  if (
    currentPage ===
    "productDetails"
  ) {
    pageToShow = (
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
    );
  }

  if (!pageToShow) {
    pageToShow = (
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

      {pageToShow}

      <Footer
        onNavigate={
          goToPage
        }
      />
    </>
  );
}

export default App;