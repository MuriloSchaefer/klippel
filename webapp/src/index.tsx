import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./kernel/App";
// eslint-disable-next-line import/extensions
import * as serviceWorker from "./sw.js";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// serviceWorker.default()

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
