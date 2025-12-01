import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastProvider } from "./components/Toast.jsx";
import { SocketProvider } from "./contexts/SocketContext";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import BioSetup from "./pages/BioSetup.jsx";
import Feed from "./pages/Feed.jsx";
import Profile from "./pages/Profile.jsx";
import Requests from "./pages/Requests.jsx";
import SavedPosts from "./pages/SavedPosts.jsx";
import FindStudyPartner from "./pages/FindStudyPartner.jsx";
import Reels from "./pages/Reels.jsx";
import Chat from "./pages/Chat.jsx";
import JoinGroup from "./pages/JoinGroup.jsx";
import Admin from "./pages/Admin.jsx";

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
  const location = useLocation();
  // Check if user is authenticated
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const isAuthenticated = !!token;
  
  // Check if user has completed bio
  const getUser = () => {
    try {
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };
  
  const user = getUser();
  const bioCompleted = user?.bioCompleted || false;

  // Helper to determine redirect for authenticated users
  const getAuthRedirect = () => {
    if (!bioCompleted) {
      return '/bio-setup';
    }
    return '/feed';
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getAuthRedirect()} replace /> : <Login darkMode={darkMode} setDarkMode={setDarkMode} />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to={getAuthRedirect()} replace /> : <Register darkMode={darkMode} setDarkMode={setDarkMode} />}
      />
      <Route
        path="/bio-setup"
        element={
          <ProtectedRoute>
            {bioCompleted ? <Navigate to="/feed" replace /> : <BioSetup />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            {!bioCompleted ? <Navigate to="/bio-setup" replace /> : <Feed />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:id"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <Requests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved-posts"
        element={
          <ProtectedRoute>
            <SavedPosts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/find-study-partner"
        element={
          <ProtectedRoute>
            <FindStudyPartner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reels"
        element={
          <ProtectedRoute>
            <Reels />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reels/:reelId"
        element={
          <ProtectedRoute>
            <Reels />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/join/:inviteLink"
        element={
          <ProtectedRoute>
            <JoinGroup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
      {/* Catch-all route - redirects unauthenticated users to login */}
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <Navigate to={getAuthRedirect()} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
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
    <ToastProvider>
      <SocketProvider>
        <Router>
          <AppRoutes darkMode={darkMode} setDarkMode={setDarkMode} />
        </Router>
      </SocketProvider>
    </ToastProvider>
  );
}

export default App;
