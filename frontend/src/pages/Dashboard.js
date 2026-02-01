import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, LogOut, PlusCircle, BookOpen, TrendingUp, Calendar, Mail, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchInvites();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dreams/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/circles/invites/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvites(response.data);
    } catch (error) {
      console.error("Failed to fetch invites:", error);
    }
  };

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/circles/invites/${inviteId}/respond?accept=${accept}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      setInvites(invites.filter(inv => inv.id !== inviteId));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
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
                {!user?.is_premium && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/premium')}
                    className="font-body text-lucid hover:text-lucid/80 font-medium"
                    data-testid="nav-premium"
                  >
                    ✨ {t('nav.premium')}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <Button
                onClick={() => navigate('/journal')}
                className="bg-void text-white hover:bg-void/90 rounded-full font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                data-testid="new-dream-button"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {t('nav.newDream')}
              </Button>
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
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-heading font-light text-void tracking-tight mb-2" data-testid="welcome-message">
                {t('dashboard.welcomeBack')} <span className="italic">{user?.name}</span>
              </h1>
              <p className="text-lg text-void/70 font-body tracking-wide">
                {t('dashboard.sanctuary')}
              </p>
            </div>
            {!user?.is_premium && (
              <Button
                onClick={() => navigate('/premium')}
                className="bg-gradient-to-r from-ethereal to-lucid text-void hover:opacity-90 rounded-full px-6 py-6 font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                data-testid="upgrade-premium-button"
              >
                ✨ {t('dashboard.upgradePremium')}
              </Button>
            )}
            {user?.is_premium && (
              <div className="px-6 py-3 bg-lucid/20 rounded-full border border-lucid/30" data-testid="premium-badge">
                <span className="text-void font-body font-medium">✨ Premium Member</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12" data-testid="loading-stats">
            <p className="text-void/60 font-body">{t('common.loading')}</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="glass-effect rounded-3xl p-8 hover:shadow-lg transition-all duration-500 hover:-translate-y-1" data-testid="stat-total-dreams">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-ethereal/20 rounded-2xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-void" />
                  </div>
                  <span className="text-3xl font-heading font-light text-void">{stats?.total_dreams || 0}</span>
                </div>
                <h3 className="text-lg font-body text-void/80">{t('dashboard.totalDreams')}</h3>
              </div>

              <div className="glass-effect rounded-3xl p-8 hover:shadow-lg transition-all duration-500 hover:-translate-y-1" data-testid="stat-week-dreams">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-lucid/20 rounded-2xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-void" />
                  </div>
                  <span className="text-3xl font-heading font-light text-void">{stats?.dreams_this_week || 0}</span>
                </div>
                <h3 className="text-lg font-body text-void/80">{t('dashboard.thisWeek')}</h3>
              </div>

              <div className="glass-effect rounded-3xl p-8 hover:shadow-lg transition-all duration-500 hover:-translate-y-1" data-testid="stat-month-dreams">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-ethereal/20 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-void" />
                  </div>
                  <span className="text-3xl font-heading font-light text-void">{stats?.dreams_this_month || 0}</span>
                </div>
                <h3 className="text-lg font-body text-void/80">{t('dashboard.thisMonth')}</h3>
              </div>
            </div>

            {/* Recent Dreams and Tags */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Recent Dreams */}
              <div className="glass-effect rounded-3xl p-8">
                <h2 className="text-2xl font-heading font-light text-void mb-6" data-testid="recent-dreams-title">{t('dashboard.recentDreams')}</h2>
                {stats?.recent_dreams && stats.recent_dreams.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recent_dreams.map((dream) => (
                      <div
                        key={dream.id}
                        onClick={() => navigate(`/dreams/${dream.id}`)}
                        className="p-4 bg-white/30 rounded-2xl hover:bg-white/50 transition-all cursor-pointer"
                        data-testid={`recent-dream-${dream.id}`}
                      >
                        <h3 className="font-body font-medium text-void mb-1">{dream.title}</h3>
                        <p className="text-sm text-void/60 font-body line-clamp-2">{dream.content}</p>
                        <div className="flex gap-2 mt-2">
                          {dream.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-lucid/20 text-void rounded-full font-body">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="no-dreams-message">
                    <p className="text-void/60 font-body mb-4">{t('dashboard.noDreams')}</p>
                    <Button
                      onClick={() => navigate('/journal')}
                      className="bg-void text-white hover:bg-void/90 rounded-full font-body"
                      data-testid="start-recording-button"
                    >
                      {t('dashboard.startRecording')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Most Common Tags */}
              <div className="glass-effect rounded-3xl p-8">
                <h2 className="text-2xl font-heading font-light text-void mb-6" data-testid="common-tags-title">{t('dashboard.commonTags')}</h2>
                {stats?.most_common_tags && stats.most_common_tags.length > 0 ? (
                  <div className="space-y-3">
                    {stats.most_common_tags.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between" data-testid={`tag-${item.tag}`}>
                        <span className="font-body text-void">{item.tag}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-lucid rounded-full"
                              style={{ width: `${(item.count / stats.total_dreams) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-void/60 font-body w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-void/60 font-body text-center py-8" data-testid="no-tags-message">{t('dashboard.noTags')}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}