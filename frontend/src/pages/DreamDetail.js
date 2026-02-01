import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Moon, LogOut, ArrowLeft, Edit2, Trash2, Sparkles, Save, Star, Share2, Download } from "lucide-react";
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [generatingArtwork, setGeneratingArtwork] = useState(false);

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
        { language: selectedLanguage },
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

  const handleRating = async (newRating) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/dreams/${id}/rate`,
        { rating: newRating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRating(newRating);
      toast.success("Rating saved!");
    } catch (error) {
      toast.error("Failed to save rating");
    }
  };

  const generateCardImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Polyfill for roundRect if not supported
    if (!ctx.roundRect) {
      ctx.roundRect = function(x, y, width, height, radius) {
        if (typeof radius === 'number') {
          radius = { tl: radius, tr: radius, br: radius, bl: radius };
        }
        this.beginPath();
        this.moveTo(x + radius.tl, y);
        this.lineTo(x + width - radius.tr, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        this.lineTo(x + width, y + height - radius.br);
        this.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        this.lineTo(x + radius.bl, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        this.lineTo(x, y + radius.tl);
        this.quadraticCurveTo(x, y, x + radius.tl, y);
        this.closePath();
      };
    }
    
    // Set canvas size for social media (Instagram post size)
    canvas.width = 1080;
    canvas.height = 1080;
    
    // Beautiful gradient background (ethereal lavender to lucid green)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#E6E6FA');
    gradient.addColorStop(0.5, '#D8BFD8');
    gradient.addColorStop(1, '#98FF98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add dreamy stars pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Main card container (white rounded rectangle)
    const cardPadding = 80;
    const cardX = cardPadding;
    const cardY = cardPadding + 100;
    const cardWidth = canvas.width - (cardPadding * 2);
    const cardHeight = canvas.height - (cardPadding * 2) - 200;
    const cardRadius = 40;
    
    // Card shadow
    ctx.shadowColor = 'rgba(26, 26, 46, 0.15)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 15;
    
    // Draw card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Top decoration - Moon and stars
    ctx.fillStyle = '#1A1A2E';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 120, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Small stars around moon
    const moonStars = [
      { x: canvas.width / 2 - 100, y: 100 },
      { x: canvas.width / 2 + 100, y: 100 },
      { x: canvas.width / 2 - 70, y: 150 }
    ];
    moonStars.forEach(star => {
      ctx.fillStyle = '#98FF98';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = star.x + Math.cos(angle) * 8;
        const y = star.y + Math.sin(angle) * 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    });
    
    // Date badge (top right of card)
    const dateText = formatDate(dream.date);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = 'rgba(26, 26, 46, 0.4)';
    ctx.textAlign = 'right';
    ctx.fillText(dateText, cardX + cardWidth - 40, cardY + 60);
    
    // Title
    ctx.font = 'italic 600 56px serif';
    ctx.fillStyle = '#1A1A2E';
    ctx.textAlign = 'center';
    
    const titleText = dream.title.length > 35 ? dream.title.substring(0, 35) + '...' : dream.title;
    ctx.fillText(titleText, canvas.width / 2, cardY + 140);
    
    // Decorative line under title
    ctx.strokeStyle = '#98FF98';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 150, cardY + 170);
    ctx.lineTo(canvas.width / 2 + 150, cardY + 170);
    ctx.stroke();
    
    // Dream content
    ctx.font = '32px sans-serif';
    ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
    ctx.textAlign = 'left';
    
    const contentText = dream.content.length > 300 ? dream.content.substring(0, 300) + '...' : dream.content;
    
    // Word wrap for content
    const maxWidth = cardWidth - 100;
    const lineHeight = 48;
    const startY = cardY + 240;
    const lines = [];
    let currentLine = '';
    
    contentText.split(' ').forEach(word => {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });
    lines.push(currentLine);
    
    // Draw content lines (max 8 lines)
    lines.slice(0, 8).forEach((line, i) => {
      ctx.fillText(line.trim(), cardX + 50, startY + (i * lineHeight));
    });
    
    // Bottom section - Branding
    const bottomY = cardY + cardHeight - 70;
    
    // DreamWise logo text
    ctx.font = 'italic 400 48px serif';
    ctx.fillStyle = '#1A1A2E';
    ctx.textAlign = 'center';
    ctx.fillText('DreamWise', canvas.width / 2, bottomY);
    
    // Tagline
    ctx.font = '24px sans-serif';
    ctx.fillStyle = 'rgba(26, 26, 46, 0.5)';
    ctx.fillText('Explore your dreams', canvas.width / 2, bottomY + 35);
    
    return canvas;
  };

  const handleDownloadCard = () => {
    try {
      const canvas = generateCardImage();
      const link = document.createElement('a');
      link.download = `dreamwise-${dream.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      
      // Append to body, click, then remove (required for some browsers)
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Card downloaded!");
    } catch (error) {
      console.error("Card generation error:", error);
      toast.error("Failed to generate card. Please try again.");
    }
  };

  const handleShareCard = async () => {
    try {
      const canvas = generateCardImage();
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to generate card image");
          return;
        }
        
        const file = new File([blob], 'dream-card.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: dream.title,
              text: `Check out my dream: ${dream.title}`
            });
            toast.success("Shared successfully!");
          } catch (error) {
            if (error.name !== 'AbortError') {
              handleDownloadCard();
            }
          }
        } else {
          handleDownloadCard();
        }
      }, 'image/png');
    } catch (error) {
      console.error("Share card error:", error);
      toast.error("Failed to share card. Please try again.");
    }
  };

  const handleGenerateArtwork = async () => {
    if (!user?.is_premium) {
      toast.error("AI Artwork is a premium feature");
      setTimeout(() => navigate('/premium'), 1500);
      return;
    }
    
    setGeneratingArtwork(true);
    toast.info("Generating your dream artwork... This may take 20-30 seconds");
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/dreams/${id}/generate-artwork`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success && response.data.image) {
        // Determine file extension from mime type
        const mimeType = response.data.mime_type || 'image/png';
        const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
        
        // Create and download the artwork
        const imageData = `data:${mimeType};base64,${response.data.image}`;
        const link = document.createElement('a');
        link.download = `dreamwise-artwork-${dream.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${extension}`;
        link.href = imageData;
        
        // Append to body, click, then remove (required for some browsers)
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("AI Artwork generated and downloaded!");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate artwork");
    } finally {
      setGeneratingArtwork(false);
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
                <Button
                  variant="ghost"
                  onClick={() => navigate('/community-hub')}
                  className="font-body text-void hover:text-void/80"
                  data-testid="nav-community-hub"
                >
                  Community
                </Button>
                {!user?.is_premium && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/premium')}
                    className="font-body text-lucid hover:text-lucid/80 font-medium"
                    data-testid="nav-premium"
                  >
                    ✨ Premium
                  </Button>
                )}
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
                onClick={() => setShowShareModal(true)}
                className="text-void hover:text-void/80"
                data-testid="share-button"
              >
                <Share2 className="w-4 h-4" />
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
            <div className="flex items-center gap-4">
              {!dream.ai_analysis && (
                <>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl px-4 py-2 font-body text-void"
                    data-testid="language-select"
                  >
                    <option value="english">English</option>
                    <option value="finnish">Suomi</option>
                    <option value="french">Français</option>
                    <option value="german">Deutsch</option>
                    <option value="spanish">Español</option>
                  </select>
                  <Button
                    onClick={handleAIAnalysis}
                    disabled={analyzing}
                    className="bg-ethereal text-void hover:bg-ethereal/90 rounded-full font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                    data-testid="analyze-button"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {analyzing ? "Analyzing..." : "Analyze Dream"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {dream.ai_analysis ? (
            <>
              <div className="prose prose-lg max-w-none mb-6">
                {dream.ai_analysis.split('\n').map((paragraph, idx) => {
                  // Check if line starts with ###
                  if (paragraph.trim().startsWith('###')) {
                    const text = paragraph.replace(/###/g, '').trim();
                    return (
                      <div key={idx} className="flex items-center gap-3 my-4">
                        <Moon className="w-5 h-5 text-ethereal flex-shrink-0" />
                        <h3 className="text-lg font-heading font-light text-void m-0">{text}</h3>
                      </div>
                    );
                  }
                  // Check if line starts with ##
                  else if (paragraph.trim().startsWith('##')) {
                    const text = paragraph.replace(/##/g, '').trim();
                    return (
                      <div key={idx} className="flex items-center gap-3 my-4">
                        <Sparkles className="w-5 h-5 text-lucid flex-shrink-0" />
                        <h2 className="text-xl font-heading font-light text-void m-0">{text}</h2>
                      </div>
                    );
                  }
                  // Regular paragraph
                  else if (paragraph.trim()) {
                    return (
                      <p key={idx} className="text-void/80 font-body leading-relaxed mb-3">
                        {paragraph}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
              
              {/* Rating Section */}
              <div className="border-t border-white/30 pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-void/70 font-body">Rate this analysis:</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-all duration-200 hover:scale-110"
                        data-testid={`star-${star}`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= (hoverRating || rating)
                              ? 'fill-lucid text-lucid'
                              : 'text-void/30'
                          }`}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-2 text-sm text-void/60 font-body">({rating}/5)</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-void/60 font-body text-center py-8" data-testid="no-ai-analysis">
              Select a language and click &quot;Analyze Dream&quot; to get AI insights
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

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-void/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
            <div className="glass-effect rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()} data-testid="share-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-heading font-light text-void">Share Your Dream</h2>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-void/60 hover:text-void transition-colors"
                  data-testid="close-modal-button"
                >
                  ✕
                </button>
              </div>

              {/* Preview */}
              <div className="mb-6 p-4 bg-white/30 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <Moon className="w-6 h-6 text-void" />
                  <h3 className="font-heading font-light text-void">{dream.title}</h3>
                </div>
                <p className="text-sm text-void/70 font-body line-clamp-3">
                  {dream.content.substring(0, 150)}...
                </p>
              </div>

              {/* Share Options */}
              <div className="space-y-3">
                <Button
                  onClick={handleShareCard}
                  className="w-full bg-ethereal text-void hover:bg-ethereal/90 rounded-full h-12 font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                  data-testid="share-card-button"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share as Card Image
                </Button>

                <Button
                  onClick={handleDownloadCard}
                  variant="outline"
                  className="w-full bg-white/50 text-void border-void/10 hover:bg-white/80 rounded-full h-12 font-body font-medium"
                  data-testid="download-card-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Card
                </Button>

                {user?.is_premium && (
                  <Button
                    onClick={handleGenerateArtwork}
                    disabled={generatingArtwork}
                    className="w-full bg-lucid/20 text-void hover:bg-lucid/30 rounded-full h-12 font-body font-medium transition-all duration-300"
                    data-testid="generate-artwork-button"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {generatingArtwork ? "Generating..." : "Generate AI Artwork (Premium)"}
                  </Button>
                )}

                {!user?.is_premium && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-void/60 font-body mb-2">
                      Want AI-generated dream artwork?
                    </p>
                    <button
                      onClick={() => navigate('/premium')}
                      className="text-sm text-lucid hover:text-lucid/80 font-body underline"
                    >
                      Upgrade to Premium
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}