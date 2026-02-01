import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, LogOut, Save, X, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import LanguageSelector from "@/components/LanguageSelector";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TAG_OPTIONS = [
  "nightmare",
  "lucid",
  "recurring",
  "vivid",
  "flying",
  "falling",
  "water",
  "chase",
  "adventure",
  "peaceful"
];

export default function DreamJournal({ user, onLogout }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    date: new Date().toISOString().split('T')[0],
    tags: [],
    is_public: false
  });

  // Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      // Set language based on current UI language
      const langMap = {
        'fi': 'fi-FI',
        'en': 'en-US',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'es': 'es-ES'
      };
      recognitionRef.current.lang = langMap[i18n.language] || 'en-US';

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setFormData(prev => ({
          ...prev,
          content: prev.content + transcript
        }));
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error(t('journal.microphoneNotAllowed') || 'Microphone access denied');
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [i18n.language, isListening, t]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error(t('journal.speechNotSupported') || 'Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast.success(t('journal.recordingStopped') || 'Recording stopped');
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info(t('journal.recordingStarted') || 'Listening... Speak your dream');
    }
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        date: new Date(formData.date).toISOString()
      };

      const response = await axios.post(`${API}/dreams`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(t('toast.dreamSaved'));
      navigate(`/dreams/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
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
          <h1 className="text-4xl sm:text-5xl font-heading font-light text-void tracking-tight mb-2" data-testid="journal-title">
            <span className="italic">{t('journal.title')}</span>
          </h1>
          <p className="text-lg text-void/70 font-body tracking-wide">
            {t('journal.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-effect rounded-3xl p-8" data-testid="dream-form">
          {/* Title */}
          <div className="mb-6">
            <Label htmlFor="title" className="text-void font-body text-lg mb-2">{t('journal.dreamTitle')}</Label>
            <Input
              id="title"
              type="text"
              placeholder={t('journal.dreamTitlePlaceholder')}
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-12"
              required
              data-testid="title-input"
            />
          </div>

          {/* Date */}
          <div className="mb-6">
            <Label htmlFor="date" className="text-void font-body text-lg mb-2">{t('journal.date')}</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-12"
              required
              data-testid="date-input"
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <Label htmlFor="content" className="text-void font-body text-lg mb-2">{t('journal.dreamContent')}</Label>
            <Textarea
              id="content"
              placeholder={t('journal.dreamContentPlaceholder')}
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl min-h-[300px] resize-none"
              required
              data-testid="content-textarea"
            />
          </div>

          {/* Tags */}
          <div className="mb-8">
            <Label className="text-void font-body text-lg mb-3 block">{t('journal.tags')}</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full font-body text-sm transition-all duration-300 ${
                    formData.tags.includes(tag)
                      ? tag === 'nightmare' 
                        ? 'bg-red-500/80 text-white'
                        : 'bg-lucid text-void'
                      : tag === 'nightmare'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-white/30 text-void/70 hover:bg-white/50'
                  }`}
                  data-testid={`tag-${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Public/Private Toggle */}
          <div className="mb-8">
            <Label className="text-void font-body text-lg mb-3 block">{t('journal.makePublic')}</Label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, is_public: false})}
                className={`px-6 py-3 rounded-full font-body transition-all duration-300 ${
                  !formData.is_public
                    ? 'bg-void text-white'
                    : 'bg-white/30 text-void/70 hover:bg-white/50'
                }`}
                data-testid="private-button"
              >
                🔒 Private
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, is_public: true})}
                className={`px-6 py-3 rounded-full font-body transition-all duration-300 ${
                  formData.is_public
                    ? 'bg-lucid text-void'
                    : 'bg-white/30 text-void/70 hover:bg-white/50'
                }`}
                data-testid="public-button"
              >
                🌍 Public
              </button>
            </div>
            <p className="text-sm text-void/60 font-body mt-2">
              {t('journal.publicDescription')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-void text-white hover:bg-void/90 rounded-full h-12 font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
              data-testid="save-dream-button"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? t('journal.saving') : t('journal.saveDream')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="bg-white/50 text-void border-void/10 hover:bg-white/80 rounded-full h-12 font-body font-medium"
              data-testid="cancel-button"
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}