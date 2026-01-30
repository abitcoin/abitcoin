import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, LogOut, Sparkles, Check, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PACKAGES = [
  {
    id: "monthly",
    name: "Premium Monthly",
    price: 9.99,
    period: "/month",
    features: [
      "Unlimited AI dream analysis",
      "Advanced dream insights",
      "Pattern recognition",
      "Priority support",
      "Export your dreams"
    ],
    popular: false
  },
  {
    id: "lifetime",
    name: "Premium Lifetime",
    price: 29.99,
    period: "one-time",
    features: [
      "Everything in Monthly",
      "Lifetime access",
      "No recurring payments",
      "Future feature updates",
      "Best value"
    ],
    popular: true
  }
];

export default function PremiumPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleUpgrade = async (packageId) => {
    setLoading(packageId);
    
    try {
      const token = localStorage.getItem('token');
      const originUrl = window.location.origin;
      
      const response = await axios.post(
        `${API}/payments/checkout?package_id=${packageId}`,
        { origin_url: originUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Redirect to Stripe checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start checkout");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass-effect border-b border-white/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <Moon className="w-8 h-8 text-void" />
                <span className="text-2xl font-heading font-light text-void tracking-tight">DreamWise</span>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard')}
                  className="font-body text-void hover:text-void/80"
                  data-testid="nav-dashboard"
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dreams')}
                  className="font-body text-void hover:text-void/80"
                  data-testid="nav-dreams"
                >
                  My Dreams
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onLogout}
              className="text-void hover:text-void/80"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-ethereal/20 backdrop-blur-md rounded-full border border-ethereal/30 mb-6">
            <Sparkles className="w-5 h-5 text-void" />
            <span className="text-sm font-body text-void font-medium">Unlock AI Dream Analysis</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-light text-void tracking-tight mb-4">
            Unlock the <span className="italic">mysteries</span>
            <br />of your dreams
          </h1>
          
          <p className="text-lg text-void/70 font-body tracking-wide max-w-2xl mx-auto mb-2">
            Upgrade to Premium and get unlimited AI-powered dream analysis with deep psychological insights
          </p>
          <p className="text-sm text-void/60 font-body">
            ✨ All users get 5 free AI analyses to try it out!
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`glass-effect rounded-3xl p-8 hover:shadow-lg transition-all duration-500 relative ${
                pkg.popular ? 'ring-2 ring-lucid' : ''
              }`}
              data-testid={`package-${pkg.id}`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-lucid text-void px-4 py-1 rounded-full text-sm font-body font-medium">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-heading font-light text-void mb-2">{pkg.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-heading font-light text-void">${pkg.price}</span>
                  <span className="text-void/60 font-body text-sm">{pkg.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-lucid/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-void" />
                    </div>
                    <span className="text-void/80 font-body">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade(pkg.id)}
                disabled={loading === pkg.id}
                className="w-full bg-void text-white hover:bg-void/90 rounded-full h-12 font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                data-testid={`upgrade-${pkg.id}-button`}
              >
                {loading === pkg.id ? "Processing..." : "Upgrade Now"}
              </Button>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="mt-20">
          <div className="glass-effect rounded-3xl p-12 text-center">
            <Sparkles className="w-12 h-12 text-lucid mx-auto mb-4" />
            <h2 className="text-3xl font-heading font-light text-void mb-4">
              Why <span className="italic">Premium?</span>
            </h2>
            <p className="text-void/70 font-body max-w-2xl mx-auto leading-relaxed mb-6">
              Our AI dream analyst uses advanced psychology and symbolism knowledge to provide deep, 
              personalized insights into your dreams. Discover hidden meanings, emotional patterns, 
              and unlock the wisdom of your subconscious mind.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-void/60 font-body">
              <span>💳 Payment options: Credit Card, Klarna</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}