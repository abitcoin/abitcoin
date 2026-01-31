import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useState, useEffect } from "react";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import DreamJournal from "@/pages/DreamJournal";
import DreamsLibrary from "@/pages/DreamsLibrary";
import DreamDetail from "@/pages/DreamDetail";
import PremiumPage from "@/pages/PremiumPage";
import PaymentSuccess from "@/pages/PaymentSuccess";
import CommunityFeed from "@/pages/CommunityFeed";
import DreamCircles from "@/pages/DreamCircles";
import CommunityHub from "@/pages/CommunityHub";
import Messages from "@/pages/Messages";
import "@/App.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={token ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/auth" element={token ? <Navigate to="/dashboard" /> : <AuthPage onLogin={handleLogin} />} />
          <Route path="/dashboard" element={token ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
          <Route path="/journal" element={token ? <DreamJournal user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
          <Route path="/dreams" element={token ? <DreamsLibrary user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
          <Route path="/dreams/:id" element={token ? <DreamDetail user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
          <Route path="/premium" element={token ? <PremiumPage user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
          <Route path="/payment-success" element={token ? <PaymentSuccess /> : <Navigate to="/auth" />} />
          <Route path="/community-hub" element={token ? <CommunityHub user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
          <Route path="/community" element={token ? <CommunityFeed user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
          <Route path="/circles" element={token ? <DreamCircles user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
          <Route path="/messages" element={token ? <Messages user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
          <Route path="/messages/:recipientId" element={token ? <Messages user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;