import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home.jsx";
import Crop from "./components/crop/Crop.jsx";
import Disease from "./components/disease/Disease.jsx";
import CropYieldPrediction from "./components/yeild/Yeild.jsx";
import Header from "./components/Header/Header.jsx";
import PestDetection from "./components/pest/PestDetection.jsx";
import Chatbot from "./components/Chatbot.jsx";
import Footer from "./components/Footer/Footer.jsx";
import Auth from "./components/auth/Auth.jsx";
import Profile from "./components/Profile.jsx";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const storedLogin = localStorage.getItem("isLoggedIn");
    if (storedLogin === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <BrowserRouter>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/crop" element={isLoggedIn ? <Crop />:<Navigate to="/login" />} />
        <Route path="/disease" element={isLoggedIn ?<Disease />:<Navigate to="/login" />} />
        <Route path="/login" element={<Auth setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" />}/>
        {/* Protected Routes */}
        <Route
          path="/yield"
          element={isLoggedIn ? <CropYieldPrediction /> : <Navigate to="/login" />}
        />
        <Route
          path="/detect"
          element={isLoggedIn ? <PestDetection /> : <Navigate to="/login" />}
        />
      </Routes>
      <Chatbot />
      <Footer />
    </BrowserRouter>
  );
}

export default App;
