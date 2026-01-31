import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, Sparkles, BookOpen, Brain, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-white to-green-100">
      {/* Navigation */}
      <nav className="glass-effect border-b border-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Moon className="w-8 h-8 text-void" />
              <span className="text-2xl font-heading font-light text-void tracking-tight">DreamWise</span>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <Button
                onClick={() => navigate('/auth')}
                className="bg-void text-white hover:bg-void/90 rounded-full px-8 py-6 font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                data-testid="get-started-nav-button"
              >
                {t('landing.getStarted')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-md rounded-full border border-white/60">
              <Sparkles className="w-4 h-4 text-lucid" />
              <span className="text-sm font-body text-void">{t('landing.tagline')}</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-light text-void tracking-tight leading-tight">
              {t('landing.heroTitle')}
              <span className="block italic text-ethereal">{t('landing.heroTitleItalic')}</span>
              {t('landing.heroTitle2')}
            </h1>
            
            <p className="text-lg text-void/70 font-body tracking-wide leading-relaxed">
              {t('landing.heroDescription')}
            </p>
            
            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => navigate('/auth')}
                className="bg-void text-white hover:bg-void/90 rounded-full px-8 py-6 font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                data-testid="get-started-hero-button"
              >
                {t('landing.startDreaming')}
              </Button>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative">
            <div className="hero-image relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1766995247546-dcc1b267175c?crop=entropy&cs=srgb&fm=jpg&q=85"
                alt="Dreamy surreal landscape"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-heading font-light text-void tracking-tight mb-4">
            Your dreams, <span className="italic">illuminated</span>
          </h2>
          <p className="text-lg text-void/70 font-body tracking-wide">
            Powerful features to help you understand your inner world
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="glass-effect rounded-3xl p-8 hover:shadow-lg transition-all duration-500 hover:-translate-y-1 dream-card-hover" data-testid="feature-journal">
            <div className="w-14 h-14 bg-ethereal/20 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-void" />
            </div>
            <h3 className="text-2xl font-heading font-light text-void mb-3">Dream Journal</h3>
            <p className="text-void/70 font-body leading-relaxed">
              Capture your dreams with rich details, tags, and dates. Build a comprehensive archive of your nocturnal journeys.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-effect rounded-3xl p-8 hover:shadow-lg transition-all duration-500 hover:-translate-y-1 dream-card-hover" data-testid="feature-analysis">
            <div className="w-14 h-14 bg-lucid/20 rounded-2xl flex items-center justify-center mb-4">
              <Brain className="w-7 h-7 text-void" />
            </div>
            <h3 className="text-2xl font-heading font-light text-void mb-3">AI Analysis</h3>
            <p className="text-void/70 font-body leading-relaxed">
              Get insightful interpretations powered by advanced AI. Explore symbols, themes, and hidden meanings in your dreams.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-effect rounded-3xl p-8 hover:shadow-lg transition-all duration-500 hover:-translate-y-1 dream-card-hover" data-testid="feature-insights">
            <div className="w-14 h-14 bg-ethereal/20 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-void" />
            </div>
            <h3 className="text-2xl font-heading font-light text-void mb-3">Track Patterns</h3>
            <p className="text-void/70 font-body leading-relaxed">
              Discover recurring themes and trends. Understand what your subconscious is trying to tell you over time.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="glass-effect rounded-3xl p-12 text-center">
          <h2 className="text-4xl sm:text-5xl font-heading font-light text-void tracking-tight mb-4">
            Ready to dive into <span className="italic">your dreams?</span>
          </h2>
          <p className="text-lg text-void/70 font-body tracking-wide mb-8">
            Join DreamWise today and start your journey of self-discovery
          </p>
          <Button
            onClick={() => navigate('/auth')}
            className="bg-void text-white hover:bg-void/90 rounded-full px-10 py-6 font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
            data-testid="get-started-cta-button"
          >
            Begin Your Journey
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Moon className="w-6 h-6 text-void" />
              <span className="font-heading text-void">DreamWise</span>
            </div>
            <p className="text-sm text-void/60 font-body">
              © 2025 DreamWise. All dreams reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}