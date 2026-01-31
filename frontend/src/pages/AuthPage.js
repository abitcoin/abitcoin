import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LanguageSelector from "@/components/LanguageSelector";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage({ onLogin }) {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? `${API}/auth/login` : `${API}/auth/signup`;
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(endpoint, payload);
      onLogin(response.data.token, response.data.user);
      toast.success(t('toast.welcomeBack'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('toast.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: formData.email });
      toast.success(t('auth.resetEmailSent'));
      setIsForgotPassword(false);
    } catch (error) {
      // Always show success message for security (don't reveal if email exists)
      toast.success(t('auth.resetEmailSent'));
      setIsForgotPassword(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1763357616397-ef60d4622e59?crop=entropy&cs=srgb&fm=jpg&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.6)'
        }}
      />
      
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector variant="minimal" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass-effect rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Moon className="w-8 h-8 text-ethereal" />
                <Sparkles className="w-6 h-6 text-lucid" />
              </div>
              <h1 className="text-3xl font-heading font-light text-white tracking-tight">
                {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
              </h1>
              <p className="text-white/80 mt-2 font-body">
                {isLogin ? t('auth.enterRealm') : t('auth.joinDreamers')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
              {!isLogin && (
                <div>
                  <Label htmlFor="name" className="text-white font-body">{t('auth.name')}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('auth.name')}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-12 mt-1"
                    required
                    data-testid="name-input"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="email" className="text-white font-body">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-12 mt-1"
                  required
                  data-testid="email-input"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-white font-body">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-12 mt-1"
                  required
                  data-testid="password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-void text-white hover:bg-void/90 rounded-full h-12 font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95 mt-6"
                data-testid="submit-button"
              >
                {loading ? t('common.loading') : (isLogin ? t('auth.signIn') : t('auth.signUp'))}
              </Button>
            </form>

            {/* Toggle */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-white/90 hover:text-white font-body text-sm transition-colors"
                data-testid="toggle-auth-button"
              >
                {isLogin 
                  ? `${t('auth.noAccount')} ${t('auth.signUpLink')}`
                  : `${t('auth.haveAccount')} ${t('auth.signInLink')}`
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}