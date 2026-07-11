import { useEffect, useState } from "react";
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

function getSavedValue(key, fallbackValue) {
  const savedValue = localStorage.getItem(key);

  if (!savedValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(savedValue);
  } catch {
    return fallbackValue;
  }
}

function App() {
  const [ageGateAccepted, setAgeGateAccepted] = useState(() => {
    return localStorage.getItem("ageGateAccepted") === "true";
  });

  const [currentPage, setCurrentPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });

  const [cartItems, setCartItems] = useState(() => {
    return getSavedValue("cartItems", []);
  });

  const [orders, setOrders] = useState(() => {
    return getSavedValue("orders", []);
  });

  const [latestOrder, setLatestOrder] = useState(() => {
    return getSavedValue("latestOrder", null);
  });

  const [partnerApplication, setPartnerApplication] = useState(() => {
    return getSavedValue("partnerApplication", null);
  });

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem("orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("latestOrder", JSON.stringify(latestOrder));
  }, [latestOrder]);

  useEffect(() => {
    localStorage.setItem(
      "partnerApplication",
      JSON.stringify(partnerApplication)
    );
  }, [partnerApplication]);

  function handleAcceptAgeGate() {
    localStorage.setItem("ageGateAccepted", "true");
    setAgeGateAccepted(true);
  }

  function goToPage(page) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleResetPrototypeData() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("cartItems");
    localStorage.removeItem("orders");
    localStorage.removeItem("latestOrder");
    localStorage.removeItem("partnerApplication");

    setIsLoggedIn(false);
    setCartItems([]);
    setOrders([]);
    setLatestOrder(null);
    setPartnerApplication(null);
    setSelectedProduct(null);
    goToPage("home");
  }

  function handleProductSelect(product) {
    setSelectedProduct(product);
    goToPage("productDetails");
  }

  function handleAddToCart(product) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.name === product.name
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.name === product.name
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentItems, { ...product, quantity: 1 }];
    });

    goToPage("cart");
  }

  function handleIncreaseQuantity(productName) {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.name === productName
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function handleDecreaseQuantity(productName) {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item.name === productName
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function handleRemoveItem(productName) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.name !== productName)
    );
  }

  function handleClearCart() {
    setCartItems([]);
  }

  function handlePlaceOrder(customerInfo = {}) {
    if (cartItems.length === 0) {
      goToPage("cart");
      return;
    }

    const order = {
      id: `304-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString(),
      status: "Test Order Received",
      customer: {
        firstName: customerInfo.firstName || "",
        lastName: customerInfo.lastName || "",
        email: customerInfo.email || "",
        address: customerInfo.address || "",
        city: customerInfo.city || "",
        state: customerInfo.state || "",
        zip: customerInfo.zip || "",
      },
      items: cartItems.map((item) => ({ ...item })),
      totalQuantity: cartItems.reduce(
        (total, item) => total + item.quantity,
        0
      ),
    };

    setOrders((currentOrders) => [order, ...currentOrders]);
    setLatestOrder(order);
    setCartItems([]);
    goToPage("orderConfirmation");
  }

  function handlePartnerApplicationSubmit(code) {
    const application = {
      code: code,
      status: "Application Submitted",
      date: new Date().toLocaleDateString(),
    };

    setPartnerApplication(application);
    goToPage("dashboard");
  }

  function handleLogin() {
    setIsLoggedIn(true);
    goToPage("dashboard");
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setSelectedProduct(null);
    setCartItems([]);
    goToPage("home");
  }

  let pageToShow;

  if (currentPage === "home") {
    pageToShow = (
      <Home
        onNavigate={goToPage}
        onProductSelect={handleProductSelect}
        isLoggedIn={isLoggedIn}
        onAddToCart={handleAddToCart}
      />
    );
  }

  if (currentPage === "products") {
    pageToShow = (
      <Products
        onProductSelect={handleProductSelect}
        isLoggedIn={isLoggedIn}
        onAddToCart={handleAddToCart}
      />
    );
  }

  if (currentPage === "quality") {
    pageToShow = <Quality onNavigate={goToPage} />;
  }

  if (currentPage === "partners") {
    pageToShow = <ResearchPartners onNavigate={goToPage} />;
  }

  if (currentPage === "faq") {
    pageToShow = <FAQ onNavigate={goToPage} />;
  }

  if (currentPage === "contact") {
    pageToShow = <Contact onNavigate={goToPage} />;
  }

  if (currentPage === "researchAgreement") {
    pageToShow = <ResearchAgreement onNavigate={goToPage} />;
  }

  if (currentPage === "login") {
    pageToShow = <Login onNavigate={goToPage} onLogin={handleLogin} />;
  }

  if (currentPage === "createAccount") {
    pageToShow = (
      <CreateAccount
        onNavigate={goToPage}
        onLogin={handleLogin}
      />
    );
  }

  if (currentPage === "dashboard") {
    pageToShow = (
      <CustomerDashboard
        onNavigate={goToPage}
        orders={orders}
        partnerApplication={partnerApplication}
      />
    );
  }

  if (currentPage === "partnerApplication") {
    pageToShow = (
      <PartnerApplication
        onNavigate={goToPage}
        onSubmitApplication={handlePartnerApplicationSubmit}
      />
    );
  }

  if (currentPage === "partnerHQ") {
    pageToShow = (
      <PartnerHQ
        onNavigate={goToPage}
        partnerApplication={partnerApplication}
      />
    );
  }

  if (currentPage === "marketingCenter") {
    pageToShow = (
      <MarketingCenter
        onNavigate={goToPage}
        partnerApplication={partnerApplication}
      />
    );
  }

  if (currentPage === "missionControl") {
    pageToShow = (
      <MissionControl
        orders={orders}
        partnerApplication={partnerApplication}
        onNavigate={goToPage}
        onResetPrototypeData={handleResetPrototypeData}
      />
    );
  }

  if (currentPage === "productManager") {
    pageToShow = <ProductManager onNavigate={goToPage} />;
  }

  if (currentPage === "coaManager") {
    pageToShow = <COAManager onNavigate={goToPage} />;
  }

  if (currentPage === "customerManager") {
    pageToShow = (
      <CustomerManager
        orders={orders}
        partnerApplication={partnerApplication}
        onNavigate={goToPage}
      />
    );
  }

  if (currentPage === "siteSettings") {
    pageToShow = <SiteSettings onNavigate={goToPage} />;
  }

  if (currentPage === "launchChecklist") {
    pageToShow = <LaunchChecklist onNavigate={goToPage} />;
  }

  if (currentPage === "cart") {
    pageToShow = (
      <Cart
        cartItems={cartItems}
        onNavigate={goToPage}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onIncreaseQuantity={handleIncreaseQuantity}
        onDecreaseQuantity={handleDecreaseQuantity}
      />
    );
  }

  if (currentPage === "checkout") {
    pageToShow = (
      <Checkout
        cartItems={cartItems}
        onNavigate={goToPage}
        onPlaceOrder={handlePlaceOrder}
      />
    );
  }

  if (currentPage === "orderConfirmation") {
    pageToShow = (
      <OrderConfirmation
        onNavigate={goToPage}
        latestOrder={latestOrder}
      />
    );
  }

  if (currentPage === "productDetails") {
    pageToShow = (
      <ProductDetails
        product={selectedProduct}
        onBack={() => goToPage("products")}
        onNavigate={goToPage}
        isLoggedIn={isLoggedIn}
        onAddToCart={handleAddToCart}
      />
    );
  }

  return (
    <>
      {!ageGateAccepted && (
        <AgeGate onAccept={handleAcceptAgeGate} />
      )}

      <Navbar
        currentPage={currentPage}
        onNavigate={goToPage}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        cartCount={cartCount}
      />

      <SiteAlert />

      {pageToShow}

      <Footer onNavigate={goToPage} />
    </>
  );
}

export default App;