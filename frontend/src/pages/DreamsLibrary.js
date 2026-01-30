import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, LogOut, PlusCircle, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function DreamsLibrary({ user, onLogout }) {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchDreams();
  }, [selectedTags, searchQuery]);

  const fetchDreams = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (selectedTags.length > 0) {
        params.tags = selectedTags.join(',');
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await axios.get(`${API}/dreams`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setDreams(response.data);
    } catch (error) {
      toast.error("Failed to load dreams");
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-heading font-light text-void tracking-tight mb-2" data-testid="library-title">
            Your <span className="italic">Dream Library</span>
          </h1>
          <p className="text-lg text-void/70 font-body tracking-wide">
            Explore your collection of dreams
          </p>
        </div>

        {/* Search and Filter */}
        <div className="glass-effect rounded-3xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-void/40" />
              <Input
                type="text"
                placeholder="Search dreams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-12 pl-12"
                data-testid="search-input"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/50 text-void border-void/10 hover:bg-white/80 rounded-xl h-12 font-body"
              data-testid="filter-button"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters {selectedTags.length > 0 && `(${selectedTags.length})`}
            </Button>
          </div>

          {/* Filter Tags */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/30" data-testid="filter-tags-container">
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-full font-body text-sm transition-all duration-300 ${
                      selectedTags.includes(tag)
                        ? 'bg-lucid text-void'
                        : 'bg-white/30 text-void/70 hover:bg-white/50'
                    }`}
                    data-testid={`filter-tag-${tag}`}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="px-4 py-2 rounded-full font-body text-sm bg-void/10 text-void hover:bg-void/20 transition-all"
                    data-testid="clear-filters-button"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dreams Grid */}
        {loading ? (
          <div className="text-center py-12" data-testid="loading-dreams">
            <p className="text-void/60 font-body">Loading dreams...</p>
          </div>
        ) : dreams.length === 0 ? (
          <div className="glass-effect rounded-3xl p-12 text-center" data-testid="no-dreams">
            <p className="text-void/60 font-body mb-4">
              {searchQuery || selectedTags.length > 0
                ? "No dreams match your filters"
                : "You haven't recorded any dreams yet"}
            </p>
            {!searchQuery && selectedTags.length === 0 && (
              <Button
                onClick={() => navigate('/journal')}
                className="bg-void text-white hover:bg-void/90 rounded-full font-body"
                data-testid="start-recording-button"
              >
                Record Your First Dream
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="dreams-grid">
            {dreams.map((dream) => (
              <div
                key={dream.id}
                onClick={() => navigate(`/dreams/${dream.id}`)}
                className="glass-effect rounded-3xl p-6 hover:shadow-lg transition-all duration-500 hover:-translate-y-1 cursor-pointer dream-card-hover"
                data-testid={`dream-card-${dream.id}`}
              >
                <div className="mb-4">
                  <h3 className="text-xl font-heading font-light text-void mb-2">{dream.title}</h3>
                  <p className="text-sm text-void/60 font-body">{formatDate(dream.date)}</p>
                </div>
                <p className="text-void/70 font-body line-clamp-3 mb-4">{dream.content}</p>
                {dream.tags && dream.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dream.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-3 py-1 bg-lucid/20 text-void rounded-full font-body"
                      >
                        {tag}
                      </span>
                    ))}
                    {dream.tags.length > 3 && (
                      <span className="text-xs px-3 py-1 bg-ethereal/20 text-void rounded-full font-body">
                        +{dream.tags.length - 3}
                      </span>
                    )}
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