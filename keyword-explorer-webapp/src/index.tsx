import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import reportWebVitals from "./reportWebVitals";
// import {
//   defineCustomElements as jeepSqlite,
//   applyPolyfills,
// } from "jeep-sqlite/loader";
// import { Capacitor } from "@capacitor/core";
// import { dbConnection, initDb } from "./lib/db";

const container = document.getElementById("app");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// applyPolyfills().then(() => {
//   jeepSqlite(window);
// });
// window.addEventListener("DOMContentLoaded", async () => {
//   const platform = Capacitor.getPlatform();

//   try {
//     if (platform === "web") {
//       const jeepEl = document.createElement("jeep-sqlite");
//       document.body.appendChild(jeepEl);
//       await customElements.whenDefined("jeep-sqlite");
//       await dbConnection.initWebStore();
//     }
//     await initDb();
//   } catch (error) {
//     console.error("Error setting up database", error);
//   }
//   root.render(
//     <React.StrictMode>
//       <App />
//     </React.StrictMode>
//   );

// });

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
