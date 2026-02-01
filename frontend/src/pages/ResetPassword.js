import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link");
      navigate("/auth");
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error(t('resetPassword.passwordsNotMatch') || "Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      toast.error(t('resetPassword.passwordTooShort') || "Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: password
      });
      
      toast.success(t('resetPassword.success') || "Password reset successfully! Please log in.");
      navigate("/auth");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dreamy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-effect rounded-3xl p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Moon className="w-8 h-8 text-ethereal" />
              <Sparkles className="w-6 h-6 text-lucid" />
            </div>
            <h1 className="text-3xl font-heading font-light text-white tracking-tight">
              {t('resetPassword.title') || "Reset Password"}
            </h1>
            <p className="text-white/80 mt-2 font-body">
              {t('resetPassword.subtitle') || "Enter your new password"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
            <div>
              <Label htmlFor="password" className="text-white font-body">
                {t('resetPassword.newPassword') || "New Password"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-12 mt-1"
                required
                minLength={6}
                data-testid="new-password-input"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-white font-body">
                {t('resetPassword.confirmPassword') || "Confirm Password"}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-12 mt-1"
                required
                minLength={6}
                data-testid="confirm-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-void text-white hover:bg-void/90 rounded-full h-12 font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95 mt-6"
              data-testid="reset-submit-button"
            >
              {loading ? t('common.loading') : (t('resetPassword.submit') || "Reset Password")}
            </Button>
          </form>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-white/90 hover:text-white font-body text-sm transition-colors"
            >
              {t('auth.backToLogin') || "Back to login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
