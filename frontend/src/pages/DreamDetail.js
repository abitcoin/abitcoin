import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Moon, LogOut, ArrowLeft, Edit2, Trash2, Sparkles, Save, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DreamDetail({ user, onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dream, setDream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [humanAnalysis, setHumanAnalysis] = useState("");
  const [editingHumanAnalysis, setEditingHumanAnalysis] = useState(false);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (id) {
      fetchDream();
    } else {
      navigate('/dreams');
    }
  }, [id]);

  const fetchDream = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dreams/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDream(response.data);
      setHumanAnalysis(response.data.human_analysis || "");
      setRating(response.data.ai_analysis_rating || 0);
    } catch (error) {
      toast.error("Failed to load dream");
      navigate('/dreams');
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/dreams/${id}/analyze`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDream({ ...dream, ai_analysis: response.data.analysis });
      
      if (response.data.remaining_free !== null && response.data.remaining_free !== undefined) {
        toast.success(
          response.data.cached 
            ? "Analysis loaded" 
            : `Analysis complete! ${response.data.remaining_free} free analyses remaining`
        );
      } else {
        toast.success(response.data.cached ? "Analysis loaded" : "Analysis complete!");
      }
    } catch (error) {
      if (error.response?.status === 403) {
        const message = error.response?.data?.detail || "Premium subscription required for AI analysis";
        toast.error(message);
        setTimeout(() => navigate('/premium'), 1500);
      } else {
        toast.error(error.response?.data?.detail || "Analysis failed");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveHumanAnalysis = async () => {
    setSavingAnalysis(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API}/dreams/${id}`,
        { human_analysis: humanAnalysis },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDream({ ...dream, human_analysis: humanAnalysis });
      setEditingHumanAnalysis(false);
      toast.success("Your analysis saved!");
    } catch (error) {
      toast.error("Failed to save analysis");
    } finally {
      setSavingAnalysis(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/dreams/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Dream deleted");
      navigate('/dreams');
    } catch (error) {
      toast.error("Failed to delete dream");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-dream">
        <p className="text-void/60 font-body">Loading dream...</p>
      </div>
    );
  }

  if (!dream) return null;

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dreams')}
          className="mb-6 text-void hover:text-void/80 font-body"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dreams
        </Button>

        {/* Dream Content */}
        <div className="glass-effect rounded-3xl p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-heading font-light text-void tracking-tight mb-2" data-testid="dream-title">
                {dream.title}
              </h1>
              <p className="text-void/60 font-body" data-testid="dream-date">{formatDate(dream.date)}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/dreams/${id}/edit`)}
                className="text-void hover:text-void/80"
                data-testid="edit-button"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-void hover:text-destructive"
                    data-testid="delete-button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-heading text-void">Delete Dream?</AlertDialogTitle>
                    <AlertDialogDescription className="font-body">
                      This action cannot be undone. This will permanently delete your dream and its analysis.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full font-body">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-white hover:bg-destructive/90 rounded-full font-body"
                      data-testid="confirm-delete-button"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Tags */}
          {dream.tags && dream.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6" data-testid="dream-tags">
              {dream.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-sm px-3 py-1 bg-lucid/20 text-void rounded-full font-body"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Dream Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-void/80 font-body leading-relaxed whitespace-pre-wrap" data-testid="dream-content">
              {dream.content}
            </p>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="glass-effect rounded-3xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-heading font-light text-void" data-testid="ai-analysis-title">
              AI <span className="italic">Analysis</span>
            </h2>
            {!dream.ai_analysis && (
              <Button
                onClick={handleAIAnalysis}
                disabled={analyzing}
                className="bg-ethereal text-void hover:bg-ethereal/90 rounded-full font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                data-testid="analyze-button"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {analyzing ? "Analyzing..." : "Analyze Dream"}
              </Button>
            )}
          </div>

          {dream.ai_analysis ? (
            <div className="prose prose-lg max-w-none">
              <p className="text-void/80 font-body leading-relaxed whitespace-pre-wrap" data-testid="ai-analysis-content">
                {dream.ai_analysis}
              </p>
            </div>
          ) : (
            <p className="text-void/60 font-body text-center py-8" data-testid="no-ai-analysis">
              Click "Analyze Dream" to get AI insights
            </p>
          )}
        </div>

        {/* Human Analysis Section */}
        <div className="glass-effect rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-heading font-light text-void" data-testid="human-analysis-title">
              Your <span className="italic">Reflections</span>
            </h2>
            {!editingHumanAnalysis && (
              <Button
                variant="ghost"
                onClick={() => setEditingHumanAnalysis(true)}
                className="text-void hover:text-void/80 font-body"
                data-testid="edit-analysis-button"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {dream.human_analysis ? "Edit" : "Add"} Notes
              </Button>
            )}
          </div>

          {editingHumanAnalysis ? (
            <div>
              <Textarea
                value={humanAnalysis}
                onChange={(e) => setHumanAnalysis(e.target.value)}
                placeholder="Write your own analysis and reflections..."
                className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl min-h-[200px] mb-4"
                data-testid="human-analysis-textarea"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveHumanAnalysis}
                  disabled={savingAnalysis}
                  className="bg-void text-white hover:bg-void/90 rounded-full font-body"
                  data-testid="save-analysis-button"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingAnalysis ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setHumanAnalysis(dream.human_analysis || "");
                    setEditingHumanAnalysis(false);
                  }}
                  className="bg-white/50 text-void border-void/10 hover:bg-white/80 rounded-full font-body"
                  data-testid="cancel-analysis-button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : dream.human_analysis ? (
            <div className="prose prose-lg max-w-none">
              <p className="text-void/80 font-body leading-relaxed whitespace-pre-wrap" data-testid="human-analysis-content">
                {dream.human_analysis}
              </p>
            </div>
          ) : (
            <p className="text-void/60 font-body text-center py-8" data-testid="no-human-analysis">
              Add your own thoughts and reflections about this dream
            </p>
          )}
        </div>
      </div>
    </div>
  );
}