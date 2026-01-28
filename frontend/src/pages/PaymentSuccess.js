import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Moon, CheckCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    } else {
      navigate('/dashboard');
    }
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('timeout');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/payments/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        // Update user in localStorage
        const userResponse = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        localStorage.setItem('user', JSON.stringify(userResponse.data));
        toast.success('Welcome to Premium!');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else if (response.data.status === 'expired') {
        setStatus('expired');
      } else {
        // Continue polling
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, pollInterval);
      }
    } catch (error) {
      setStatus('error');
      toast.error('Failed to verify payment');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass-effect rounded-3xl p-12 max-w-md w-full mx-4 text-center">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Moon className="w-8 h-8 text-void" />
          <span className="text-2xl font-heading font-light text-void tracking-tight">DreamWise</span>
        </div>

        {status === 'checking' && (
          <>
            <Loader className="w-16 h-16 text-lucid mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-heading font-light text-void mb-2">Verifying Payment...</h2>
            <p className="text-void/70 font-body">Please wait while we confirm your payment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-lucid mx-auto mb-4" />
            <h2 className="text-2xl font-heading font-light text-void mb-2">Payment Successful!</h2>
            <p className="text-void/70 font-body mb-6">Welcome to Premium. Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-2xl font-heading font-light text-void mb-2">Payment Verification Failed</h2>
            <p className="text-void/70 font-body mb-6">Please contact support if you were charged.</p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-void text-white hover:bg-void/90 rounded-full font-body"
            >
              Back to Dashboard
            </Button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <h2 className="text-2xl font-heading font-light text-void mb-2">Verification Timeout</h2>
            <p className="text-void/70 font-body mb-6">This may take a few minutes. Check your email for confirmation.</p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-void text-white hover:bg-void/90 rounded-full font-body"
            >
              Back to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}