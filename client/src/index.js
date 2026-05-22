import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Global reset
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
    transition: background-color 0.35s ease, color 0.35s ease;
  }

  button {
    transition: all 0.2s ease;
  }

  button:hover {
    opacity: 0.85;
    transform: translateY(-1px);
  }

  input, select, textarea {
    font-family: inherit;
    transition: all 0.2s ease;
  }

  ::-webkit-scrollbar {
    width: 5px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #2d2d4e;
    border-radius: 4px;
    transition: background 0.3s ease;
  }
`;
document.head.appendChild(style);
document.body.style.transition = "background-color 0.35s ease, color 0.35s ease";

ReactDOM.createRoot(document.getElementById("root")).render( < App / > );