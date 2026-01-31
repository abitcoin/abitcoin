import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, LogOut, PlusCircle, Heart, MessageCircle, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";

export default function CommunityHub({ user, onLogout }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-heading font-light text-void tracking-tight mb-4">
            <span className="italic">{t('communityHub.title')}</span> {t('communityHub.titleSuffix')}
          </h1>
          <p className="text-xl text-void/70 font-body tracking-wide max-w-2xl mx-auto">
            {t('communityHub.subtitle')}
          </p>
        </div>

        {/* Community Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Dream Feed */}
          <div
            onClick={() => navigate('/community')}
            className="glass-effect rounded-3xl p-10 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer dream-card-hover"
            data-testid="community-feed-card"
          >
            <div className="w-16 h-16 bg-ethereal/20 rounded-2xl flex items-center justify-center mb-6">
              <TrendingUp className="w-8 h-8 text-void" />
            </div>
            <h2 className="text-3xl font-heading font-light text-void mb-3">{t('communityHub.feedTitle')}</h2>
            <p className="text-void/70 font-body leading-relaxed mb-6">
              {t('communityHub.feedDescription')}
            </p>
            <div className="flex items-center gap-4 text-sm text-void/60 font-body">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>{t('communityHub.likeDreams')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>{t('communityHub.comment')}</span>
              </div>
            </div>
            <Button
              className="w-full mt-6 bg-ethereal text-void hover:bg-ethereal/90 rounded-full h-12 font-body font-medium transition-all duration-300"
            >
              {t('communityHub.exploreFeed')} →
            </Button>
          </div>

          {/* Dream Circles */}
          <div
            onClick={() => navigate('/circles')}
            className="glass-effect rounded-3xl p-10 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer dream-card-hover"
            data-testid="community-circles-card"
          >
            <div className="w-16 h-16 bg-lucid/20 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-void" />
            </div>
            <h2 className="text-3xl font-heading font-light text-void mb-3">{t('communityHub.circlesTitle')}</h2>
            <p className="text-void/70 font-body leading-relaxed mb-6">
              {t('communityHub.circlesDescription')}
            </p>
            <div className="flex items-center gap-4 text-sm text-void/60 font-body">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{t('communityHub.joinGroups')}</span>
              </div>
              {user?.is_premium && (
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  <span>{t('communityHub.createCircles')}</span>
                </div>
              )}
            </div>
            <Button
              className="w-full mt-6 bg-lucid text-void hover:bg-lucid/90 rounded-full h-12 font-body font-medium transition-all duration-300"
            >
              {t('communityHub.browseCircles')} →
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="glass-effect rounded-3xl p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-heading font-light text-void mb-6 text-center">
            {t('communityHub.benefits')}
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-heading font-light text-void mb-2">
                {user?.is_premium ? '∞' : '10'}
              </div>
              <div className="text-sm text-void/70 font-body">
                {user?.is_premium ? t('communityHub.unlimitedLikes') : t('communityHub.likesPerDay')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-light text-void mb-2">
                {user?.is_premium ? '∞' : '3'}
              </div>
              <div className="text-sm text-void/70 font-body">
                {user?.is_premium ? t('communityHub.unlimitedComments') : t('communityHub.commentsPerDay')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-light text-void mb-2">
                {user?.is_premium ? '∞' : '3'}
              </div>
              <div className="text-sm text-void/70 font-body">
                {user?.is_premium ? t('communityHub.unlimitedCircles') : t('communityHub.circlesToJoin')}
              </div>
            </div>
          </div>
          
          {!user?.is_premium && (
            <div className="text-center mt-6 pt-6 border-t border-white/30">
              <p className="text-void/70 font-body mb-4">
                {t('communityHub.wantUnlimited')}
              </p>
              <Button
                onClick={() => navigate('/premium')}
                className="bg-void text-white hover:bg-void/90 rounded-full font-body font-medium"
              >
                ✨ {t('dashboard.upgradePremium')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
