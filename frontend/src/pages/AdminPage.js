import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, LogOut, Users, Trash2, Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LanguageSelector from "@/components/LanguageSelector";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPage({ user, onLogout }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("Vain admin-käyttäjille");
        navigate('/dashboard');
      } else {
        toast.error("Virhe ladattaessa käyttäjiä");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (email) => {
    if (!window.confirm(`Haluatko varmasti poistaa käyttäjän ${email}?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/users/${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Käyttäjä ${email} poistettu!`);
      setUsers(users.filter(u => u.email !== email));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Virhe poistettaessa");
    }
  };

  const handleTogglePremium = async (email, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/admin/users/${encodeURIComponent(email)}/premium?is_premium=${!currentStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Premium ${!currentStatus ? 'aktivoitu' : 'poistettu'}: ${email}`);
      setUsers(users.map(u => 
        u.email === email ? { ...u, is_premium: !currentStatus } : u
      ));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Virhe");
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-dreamy">
      {/* Navigation */}
      <nav className="glass-effect border-b border-white/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-void hover:text-void/70">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Moon className="w-8 h-8 text-void" />
                <span className="font-heading text-xl text-void">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <Button
                variant="ghost"
                onClick={onLogout}
                className="text-void hover:text-void/70 rounded-full"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-effect rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-void" />
            <h1 className="text-3xl font-heading font-light text-void">Käyttäjähallinta</h1>
          </div>

          {/* Search */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Hae sähköpostilla tai nimellä..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/50 border-transparent focus:border-ethereal rounded-xl"
            />
          </div>

          {/* Users List */}
          {loading ? (
            <p className="text-void/60 text-center py-8">Ladataan...</p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <p className="text-void/60 text-center py-8">Ei käyttäjiä</p>
              ) : (
                filteredUsers.map((u) => (
                  <div 
                    key={u.id} 
                    className="flex items-center justify-between bg-white/50 rounded-xl p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-body text-void font-medium">{u.name}</p>
                        {u.is_premium && (
                          <span className="px-2 py-0.5 bg-lucid/20 text-void text-xs rounded-full">
                            ✨ Premium
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-void/60 font-body">{u.email}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Toggle Premium */}
                      <Button
                        onClick={() => handleTogglePremium(u.email, u.is_premium)}
                        variant="outline"
                        size="sm"
                        className={`rounded-full ${u.is_premium ? 'border-lucid text-lucid' : 'border-void/20'}`}
                        title={u.is_premium ? 'Poista Premium' : 'Anna Premium'}
                      >
                        <Crown className="w-4 h-4" />
                      </Button>
                      
                      {/* Delete User */}
                      {u.email !== 'annelelouarn1@outlook.com' && (
                        <Button
                          onClick={() => handleDeleteUser(u.email)}
                          variant="outline"
                          size="sm"
                          className="rounded-full border-red-300 text-red-500 hover:bg-red-50"
                          title="Poista käyttäjä"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <p className="text-sm text-void/40 mt-6 text-center">
            Yhteensä {users.length} käyttäjää
          </p>
        </div>
      </div>
    </div>
  );
}
