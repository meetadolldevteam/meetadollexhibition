import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (window.location.hostname === "www.meetadollexhibition.com") {
  window.location.replace(
    "https://meetadollexhibition.com" +
      window.location.pathname +
      window.location.search +
      window.location.hash
  );
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
