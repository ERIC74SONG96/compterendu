import React from "react";
import ReactDOM from "react-dom/client";
import { storage } from "./storage";
import CompteRenduApp from "./App";
import "./index.css";

window.storage = storage;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CompteRenduApp />
  </React.StrictMode>
);
