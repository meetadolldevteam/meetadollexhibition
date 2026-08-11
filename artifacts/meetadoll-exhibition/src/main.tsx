import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Meetadoll app root element was not found");
}

if (window.location.hostname === "www.meetadollexhibition.com") {
  window.location.replace(
    "https://meetadollexhibition.com" +
      window.location.pathname +
      window.location.search +
      window.location.hash
  );
} else {
  createRoot(rootElement).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>,
  );
}
