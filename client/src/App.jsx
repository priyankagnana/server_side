import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";

// Component to check auth and redirect
function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

function AppRoutes({ darkMode, setDarkMode }) {
  // Check if user is authenticated
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const isAuthenticated = !!token;

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/coming-soon" replace /> : <Login darkMode={darkMode} setDarkMode={setDarkMode} />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/coming-soon" replace /> : <Register darkMode={darkMode} setDarkMode={setDarkMode} />}
      />
      <Route
        path="/coming-soon"
        element={
          <ProtectedRoute>
            <ComingSoon />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/coming-soon" replace /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <Router>
      <AppRoutes darkMode={darkMode} setDarkMode={setDarkMode} />
    </Router>
  );
}

export default App;
