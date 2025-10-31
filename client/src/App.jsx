import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";      

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
      <Routes>
        <Route
          path="/*"
          element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
