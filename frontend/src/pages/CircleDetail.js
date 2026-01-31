import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, LogOut, PlusCircle, ArrowLeft, Users, MessageCircle, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import LanguageSelector from "@/components/LanguageSelector";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CircleDetail({ user, onLogout }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { circleId } = useParams();
  
  const [circle, setCircle] = useState(null);
  const [sharedDreams, setSharedDreams] = useState([]);
  const [userDreams, setUserDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDreamId, setSelectedDreamId] = useState("");
  const [interpretationText, setInterpretationText] = useState({});
  const [expandedDream, setExpandedDream] = useState(null);

  useEffect(() => {
    fetchCircleData();
    fetchUserDreams();
  }, [circleId]);

  const fetchCircleData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get circle info
      const circlesResponse = await axios.get(`${API}/circles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const foundCircle = circlesResponse.data.find(c => c.id === circleId);
      setCircle(foundCircle);
      
      // Get shared dreams
      const dreamsResponse = await axios.get(`${API}/circles/${circleId}/dreams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSharedDreams(dreamsResponse.data);
    } catch (error) {
      console.error("Failed to fetch circle data:", error);
      if (error.response?.status === 403) {
        toast.error("You must be a member to view this circle");
        navigate('/circles');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDreams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dreams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserDreams(response.data);
    } catch (error) {
      console.error("Failed to fetch user dreams:", error);
    }
  };

  const handleShareDream = async () => {
    if (!selectedDreamId) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/circles/${circleId}/dreams`,
        { dream_id: selectedDreamId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Dream shared to circle!");
      setShowShareModal(false);
      setSelectedDreamId("");
      fetchCircleData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  const handleAddInterpretation = async (dreamId) => {
    const text = interpretationText[dreamId];
    if (!text?.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/circles/${circleId}/dreams/${dreamId}/interpretations`,
        { interpretation: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setSharedDreams(dreams => 
        dreams.map(d => 
          d.dream_id === dreamId 
            ? { ...d, interpretations: [...(d.interpretations || []), response.data] }
            : d
        )
      );
      
      setInterpretationText({ ...interpretationText, [dreamId]: "" });
      toast.success("Interpretation added!");
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isMember = circle?.member_ids?.includes(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-void/60 font-body">{t('common.loading')}</p>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-void/60 font-body">Circle not found</p>
      </div>
    );
  }

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
                >
                  {t('nav.dashboard')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/community-hub')}
                  className="font-body text-lucid hover:text-lucid/80 font-medium"
                >
                  {t('nav.community')}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <Button
                onClick={() => navigate('/journal')}
                className="bg-void text-white hover:bg-void/90 rounded-full font-body font-medium"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {t('nav.newDream')}
              </Button>
              <Button variant="ghost" onClick={onLogout} className="text-void hover:text-void/80">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/circles')}
          className="flex items-center gap-2 text-void/70 hover:text-void font-body mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('circles.backToCircles')}
        </button>

        {/* Circle Header */}
        <div className="glass-effect rounded-3xl p-8 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 bg-lucid/20 rounded-2xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-void" />
                </div>
                <div>
                  <h1 className="text-3xl font-heading font-light text-void">{circle.name}</h1>
                  <p className="text-void/60 font-body">{circle.member_count} {circle.member_count === 1 ? t('circles.member') : t('circles.members')}</p>
                </div>
              </div>
              <p className="text-void/80 font-body mt-4">{circle.description}</p>
            </div>
            
            {isMember && (
              <Button
                onClick={() => setShowShareModal(true)}
                className="bg-lucid text-void hover:bg-lucid/90 rounded-full font-body font-medium"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {t('circles.shareDream')}
              </Button>
            )}
          </div>
        </div>

        {/* Shared Dreams */}
        <h2 className="text-2xl font-heading font-light text-void mb-4">{t('circles.sharedDreams')}</h2>
        
        {sharedDreams.length === 0 ? (
          <div className="glass-effect rounded-3xl p-12 text-center">
            <MessageCircle className="w-12 h-12 text-void/30 mx-auto mb-4" />
            <p className="text-void/60 font-body">{t('circles.noSharedDreams')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sharedDreams.map((dream) => (
              <div key={dream.id} className="glass-effect rounded-3xl p-6">
                {/* Dream Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-ethereal/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-void" />
                  </div>
                  <div>
                    <span className="font-body font-medium text-void">{dream.user_name}</span>
                    <span className="text-void/50 font-body text-sm ml-2">{formatDate(dream.created_at)}</span>
                  </div>
                </div>

                {/* Dream Content */}
                <h3 className="text-xl font-heading font-light text-void mb-2">{dream.dream_title}</h3>
                <p className="text-void/80 font-body mb-4 line-clamp-3">{dream.dream_content}</p>
                
                {/* Tags */}
                {dream.dream_tags && dream.dream_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {dream.dream_tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-full font-body ${
                          tag === 'nightmare'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-lucid/20 text-void'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Interpretations Section */}
                <div className="mt-4 pt-4 border-t border-white/30">
                  <button
                    onClick={() => setExpandedDream(expandedDream === dream.id ? null : dream.id)}
                    className="flex items-center gap-2 text-void font-body font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('circles.interpretations')} ({dream.interpretations?.length || 0})
                  </button>
                  
                  {expandedDream === dream.id && (
                    <div className="mt-4 space-y-4">
                      {/* Existing Interpretations */}
                      {dream.interpretations && dream.interpretations.length > 0 ? (
                        dream.interpretations.map((interp) => (
                          <div key={interp.id} className="bg-white/30 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-body font-medium text-void">{interp.user_name}</span>
                              {interp.is_premium && (
                                <span className="text-xs px-1.5 py-0.5 bg-lucid/20 text-void rounded-full">✨</span>
                              )}
                              <span className="text-xs text-void/50 font-body">{formatDate(interp.created_at)}</span>
                            </div>
                            <p className="text-void/80 font-body">{interp.interpretation}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-void/50 font-body text-sm">{t('circles.noInterpretations')}</p>
                      )}
                      
                      {/* Add Interpretation */}
                      <div className="flex gap-2">
                        <Textarea
                          placeholder={t('circles.addInterpretation')}
                          value={interpretationText[dream.dream_id] || ""}
                          onChange={(e) => setInterpretationText({ ...interpretationText, [dream.dream_id]: e.target.value })}
                          className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl"
                        />
                        <Button
                          onClick={() => handleAddInterpretation(dream.dream_id)}
                          disabled={!interpretationText[dream.dream_id]?.trim()}
                          className="bg-void text-white hover:bg-void/90 rounded-xl px-4 self-end"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Dream Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-void/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="glass-effect rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-heading font-light text-void mb-4">{t('circles.shareDream')}</h2>
            <p className="text-void/70 font-body mb-4">{t('circles.selectDream')}</p>
            
            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {userDreams.map((dream) => (
                <button
                  key={dream.id}
                  onClick={() => setSelectedDreamId(dream.id)}
                  className={`w-full p-3 rounded-xl text-left transition-colors ${
                    selectedDreamId === dream.id
                      ? 'bg-lucid/30 border-2 border-lucid'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                >
                  <span className="font-body font-medium text-void">{dream.title}</span>
                  <p className="text-sm text-void/60 font-body truncate">{dream.content}</p>
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleShareDream}
                disabled={!selectedDreamId}
                className="flex-1 bg-void text-white hover:bg-void/90 rounded-full h-12 font-body font-medium"
              >
                {t('circles.shareDream')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowShareModal(false)}
                className="flex-1 bg-white/50 text-void border-void/10 hover:bg-white/80 rounded-full h-12 font-body font-medium"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
