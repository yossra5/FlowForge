// client/src/App.jsx
// Routing logic:
//   loading      → Splash
//   !user        → AuthPage
//   showWelcome  → WelcomePage (3-second auto-redirect)
//   openWorkflow → EditorPage
//   default      → DashboardPage

import React, { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider }         from "./context/ThemeContext";
import { VariablesProvider }     from "./context/VariablesContext";
import { NodeExecutionProvider } from "./context/NodeExecutionContext";
import { workflowAPI }           from "./services/api";
import AuthPage      from "./pages/AuthPage";
import WelcomePage   from "./pages/Welcomepage";
import DashboardPage from "./pages/DashboardPage";
import EditorPage    from "./pages/EditorPage";

function AppInner() {
  const { user, loading } = useAuth();

  const [showWelcome,     setShowWelcome]     = useState(false);
  const [openWorkflow,    setOpenWorkflow]     = useState(null);
  const [loadingWorkflow, setLoadingWorkflow]  = useState(false);

  // Track the previous user value so we detect the moment of login
  const prevUserRef = useRef(null);

  useEffect(() => {
    const wasLoggedOut = prevUserRef.current === null;
    const isNowLoggedIn = user !== null;

    // Only show welcome on the TRANSITION from logged-out → logged-in
    // (not on page refresh where we restore an existing session quietly)
    if (!loading && wasLoggedOut && isNowLoggedIn) {
      setShowWelcome(true);
    }

    prevUserRef.current = user;
  }, [user, loading]);

  if (loading)         return <Splash text="Loading…" />;
  if (!user)           return <AuthPage />;
  if (showWelcome)     return <WelcomePage user={user} onContinue={() => setShowWelcome(false)} />;
  if (loadingWorkflow) return <Splash text="Opening workflow…" />;

  const handleOpen = async (meta) => {
    setLoadingWorkflow(true);
    try {
      const id  = meta._id || meta.id;
      const res = await workflowAPI.get(id);
      setOpenWorkflow(res.data);
    } catch (err) {
      console.error("[open]", err);
      alert("Could not load workflow.");
    } finally {
      setLoadingWorkflow(false);
    }
  };

  if (openWorkflow) {
    return (
      <VariablesProvider>
        <NodeExecutionProvider>
          <EditorPage workflow={openWorkflow} onBack={() => setOpenWorkflow(null)} />
        </NodeExecutionProvider>
      </VariablesProvider>
    );
  }

  return <DashboardPage onOpen={handleOpen} />;
}

function Splash({ text }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#555", fontSize: 14,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {text}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}