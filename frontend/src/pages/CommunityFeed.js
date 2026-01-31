import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, LogOut, PlusCircle, Heart, MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import LanguageSelector from "@/components/LanguageSelector";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CommunityFeed({ user, onLogout }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentingOn, setCommentingOn] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState({});

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeed(response.data);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (dreamId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/dreams/${dreamId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update feed
      setFeed(feed.map(item => 
        item.id === dreamId 
          ? { ...item, liked_by_me: response.data.liked, likes_count: item.likes_count + (response.data.liked ? 1 : -1) }
          : item
      ));
      
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  const toggleComments = async (dreamId) => {
    if (showComments[dreamId]) {
      setShowComments({ ...showComments, [dreamId]: null });
    } else {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/dreams/${dreamId}/comments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setShowComments({ ...showComments, [dreamId]: response.data });
      } catch (error) {
        toast.error(t('common.error'));
      }
    }
  };

  const handleComment = async (dreamId) => {
    if (!commentText.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/dreams/${dreamId}/comments?content=${encodeURIComponent(commentText)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add comment to list
      setShowComments({
        ...showComments,
        [dreamId]: [response.data, ...(showComments[dreamId] || [])]
      });
      
      setCommentText("");
      setCommentingOn(null);
      toast.success(t('toast.commentAdded'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
                  className="font-body text-lucid hover:text-lucid/80 font-medium"
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-heading font-light text-void tracking-tight mb-2">
            {t('feed.title')} <span className="italic">{t('feed.titleItalic')}</span>
          </h1>
          <p className="text-lg text-void/70 font-body tracking-wide">
            {t('feed.subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-void/60 font-body">{t('feed.loading')}</p>
          </div>
        ) : feed.length === 0 ? (
          <div className="glass-effect rounded-3xl p-12 text-center">
            <p className="text-void/60 font-body mb-4">{t('feed.noPublicDreams')}</p>
            <Button
              onClick={() => navigate('/journal')}
              className="bg-void text-white hover:bg-void/90 rounded-full font-body"
            >
              {t('feed.shareFirst')}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {feed.map((dream) => (
              <div key={dream.id} className="glass-effect rounded-3xl p-6 hover:shadow-lg transition-all duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ethereal/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-void" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-body font-medium text-void">{dream.user_name}</span>
                        {dream.user_is_premium && (
                          <span className="text-xs px-2 py-0.5 bg-lucid/20 text-void rounded-full">✨ Premium</span>
                        )}
                      </div>
                      <span className="text-sm text-void/60 font-body">{formatDate(dream.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-4 cursor-pointer" onClick={() => navigate(`/dreams/${dream.id}`)}>
                  <h3 className="text-xl font-heading font-light text-void mb-2">{dream.title}</h3>
                  <p className="text-void/80 font-body line-clamp-3">{dream.content}</p>
                  
                  {/* Tags */}
                  {dream.tags && dream.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {dream.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs px-3 py-1 bg-lucid/20 text-void rounded-full font-body">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-white/30">
                  <button
                    onClick={() => handleLike(dream.id)}
                    className="flex items-center gap-2 text-void/70 hover:text-void transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${dream.liked_by_me ? 'fill-red-500 text-red-500' : ''}`} />
                    <span className="text-sm font-body">{dream.likes_count || 0}</span>
                  </button>
                  
                  <button
                    onClick={() => toggleComments(dream.id)}
                    className="flex items-center gap-2 text-void/70 hover:text-void transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-body">{t('feed.comments')}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {showComments[dream.id] && (
                  <div className="mt-4 pt-4 border-t border-white/30">
                    {/* Add Comment */}
                    <div className="mb-4">
                      <Textarea
                        placeholder={t('feed.addComment')}
                        value={commentingOn === dream.id ? commentText : ""}
                        onChange={(e) => {
                          setCommentText(e.target.value);
                          setCommentingOn(dream.id);
                        }}
                        className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl mb-2"
                      />
                      <Button
                        onClick={() => handleComment(dream.id)}
                        disabled={!commentText.trim()}
                        className="bg-void text-white hover:bg-void/90 rounded-full font-body text-sm"
                      >
                        {t('feed.postComment')}
                      </Button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3">
                      {showComments[dream.id]?.map((comment) => (
                        <div key={comment.id} className="bg-white/30 rounded-2xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-body font-medium text-void">{comment.user_name}</span>
                            <span className="text-xs text-void/50">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-void/80 font-body">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
