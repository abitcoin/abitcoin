import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, LogOut, PlusCircle, Users, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import LanguageSelector from "@/components/LanguageSelector";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DreamCircles({ user, onLogout }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_private: false
  });

  useEffect(() => {
    fetchCircles();
  }, []);

  const fetchCircles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/circles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCircles(response.data);
    } catch (error) {
      toast.error("Failed to load circles");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCircle = async (e) => {
    e.preventDefault();
    
    if (!user?.is_premium) {
      toast.error("Creating circles is a premium feature");
      setTimeout(() => navigate('/premium'), 1500);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/circles`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCircles([response.data, ...circles]);
      setShowCreateModal(false);
      setFormData({ name: "", description: "", is_private: false });
      toast.success("Circle created!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create circle");
    }
  };

  const handleJoinCircle = async (circleId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/circles/${circleId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update circle in list
      setCircles(circles.map(circle => 
        circle.id === circleId 
          ? { 
              ...circle, 
              member_count: circle.member_count + (response.data.joined ? 1 : -1),
              member_ids: response.data.joined 
                ? [...circle.member_ids, user.id]
                : circle.member_ids.filter(id => id !== user.id)
            }
          : circle
      ));
      
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to join circle");
    }
  };

  const isMember = (circle) => {
    return circle.member_ids?.includes(user?.id);
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
                  className="font-body text-lucid hover:text-lucid/80 font-medium"
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
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/journal')}
                className="bg-void text-white hover:bg-void/90 rounded-full font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                data-testid="new-dream-button"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                New Dream
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-heading font-light text-void tracking-tight mb-2">
              Dream <span className="italic">Circles</span>
            </h1>
            <p className="text-lg text-void/70 font-body tracking-wide">
              Join communities of dreamers with shared interests
            </p>
          </div>
          
          {user?.is_premium && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-lucid text-void hover:bg-lucid/90 rounded-full font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
              data-testid="create-circle-button"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Circle
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-void/60 font-body">Loading circles...</p>
          </div>
        ) : circles.length === 0 ? (
          <div className="glass-effect rounded-3xl p-12 text-center">
            <Users className="w-16 h-16 text-void/30 mx-auto mb-4" />
            <p className="text-void/60 font-body mb-4">No circles yet</p>
            {user?.is_premium ? (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-void text-white hover:bg-void/90 rounded-full font-body"
              >
                Create First Circle
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/premium')}
                className="bg-lucid text-void hover:bg-lucid/90 rounded-full font-body"
              >
                Upgrade to Create Circles
              </Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {circles.map((circle) => (
              <div
                key={circle.id}
                className="glass-effect rounded-3xl p-6 hover:shadow-lg transition-all duration-300 dream-card-hover"
                data-testid={`circle-${circle.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-lucid/20 rounded-2xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-void" />
                  </div>
                  {circle.is_private ? (
                    <Lock className="w-4 h-4 text-void/40" />
                  ) : (
                    <Globe className="w-4 h-4 text-void/40" />
                  )}
                </div>

                <h3 className="text-xl font-heading font-light text-void mb-2">{circle.name}</h3>
                <p className="text-void/70 font-body text-sm mb-4 line-clamp-2">{circle.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-white/30">
                  <div className="text-sm text-void/60 font-body">
                    {circle.member_count} {circle.member_count === 1 ? 'member' : 'members'}
                  </div>
                  
                  <Button
                    onClick={() => handleJoinCircle(circle.id)}
                    className={`rounded-full font-body text-sm transition-all duration-300 ${
                      isMember(circle)
                        ? 'bg-white/30 text-void hover:bg-white/50'
                        : 'bg-lucid text-void hover:bg-lucid/90'
                    }`}
                    data-testid={`join-circle-${circle.id}`}
                  >
                    {isMember(circle) ? 'Leave' : 'Join'}
                  </Button>
                </div>

                {circle.creator_name && (
                  <div className="text-xs text-void/50 font-body mt-2">
                    Created by {circle.creator_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!user?.is_premium && circles.length > 0 && (
          <div className="glass-effect rounded-3xl p-8 mt-8 text-center">
            <h3 className="text-2xl font-heading font-light text-void mb-2">
              Want to create your own circle?
            </h3>
            <p className="text-void/70 font-body mb-4">
              Upgrade to Premium to create unlimited dream circles
            </p>
            <Button
              onClick={() => navigate('/premium')}
              className="bg-lucid text-void hover:bg-lucid/90 rounded-full font-body font-medium"
            >
              Upgrade to Premium
            </Button>
          </div>
        )}
      </div>

      {/* Create Circle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-void/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="glass-effect rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()} data-testid="create-circle-modal">
            <h2 className="text-2xl font-heading font-light text-void mb-6">Create Dream Circle</h2>
            
            <form onSubmit={handleCreateCircle} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-void font-body">Circle Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Lucid Dreamers"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-12 mt-1"
                  required
                  data-testid="circle-name-input"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-void font-body">Description</Label>
                <Textarea
                  id="description"
                  placeholder="A community for exploring lucid dreaming techniques..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl mt-1"
                  required
                  data-testid="circle-description-input"
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_private: false})}
                  className={`flex-1 px-4 py-3 rounded-full font-body text-sm transition-all ${
                    !formData.is_private
                      ? 'bg-lucid text-void'
                      : 'bg-white/30 text-void/70 hover:bg-white/50'
                  }`}
                >
                  🌍 Public
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_private: true})}
                  className={`flex-1 px-4 py-3 rounded-full font-body text-sm transition-all ${
                    formData.is_private
                      ? 'bg-void text-white'
                      : 'bg-white/30 text-void/70 hover:bg-white/50'
                  }`}
                >
                  🔒 Private
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-void text-white hover:bg-void/90 rounded-full h-12 font-body font-medium"
                  data-testid="submit-circle-button"
                >
                  Create Circle
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-white/50 text-void border-void/10 hover:bg-white/80 rounded-full h-12 font-body font-medium"
                  data-testid="cancel-circle-button"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
