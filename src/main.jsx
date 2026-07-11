import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

document.title = "304 Peptides | Research Use Only";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);