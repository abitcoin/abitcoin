import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, LogOut, Sparkles, Check, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PremiumPage({ user, onLogout }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(null);

  const PACKAGES = [
    {
      id: "monthly",
      name: t('premium.monthly'),
      price: 9.99,
      period: t('premium.perMonth'),
      features: [
        t('premium.features.unlimited'),
        t('premium.features.artwork'),
        t('premium.features.circles'),
        t('premium.features.priority'),
        t('premium.features.updates')
      ],
      popular: false
    },
    {
      id: "lifetime",
      name: t('premium.lifetime'),
      price: 29.99,
      period: t('premium.oneTime'),
      features: [
        t('premium.features.unlimited'),
        t('premium.features.artwork'),
        t('premium.features.circles'),
        t('premium.features.priority'),
        t('premium.features.bestValue')
      ],
      popular: true
    }
  ];

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
      toast.error(error.response?.data?.detail || t('common.error'));
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
                  {t('nav.dashboard')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dreams')}
                  className="font-body text-void hover:text-void/80"
                  data-testid="nav-dreams"
                >
                  {t('nav.myDreams')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/community-hub')}
                  className="font-body text-void hover:text-void/80"
                  data-testid="nav-community-hub"
                >
                  {t('nav.community')}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSelector variant="minimal" />
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
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-ethereal/20 backdrop-blur-md rounded-full border border-ethereal/30 mb-6">
            <Sparkles className="w-5 h-5 text-void" />
            <span className="text-sm font-body text-void font-medium">{t('premium.badge')}</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-light text-void tracking-tight mb-4">
            {t('premium.title')} <span className="italic">{t('premium.titleItalic')}</span>
          </h1>
          
          <p className="text-lg text-void/70 font-body tracking-wide max-w-2xl mx-auto mb-2">
            {t('premium.subtitle')}
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
                    {t('premium.popular')}
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
                {loading === pkg.id ? t('common.loading') : t('premium.subscribe')}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}