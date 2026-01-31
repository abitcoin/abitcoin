import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSelector({ variant = 'default' }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'minimal') {
    return (
      <div className="relative z-[100]" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-sm text-void/70 hover:text-void transition-colors px-2 py-1 rounded-lg hover:bg-white/50"
          data-testid="language-selector"
        >
          <span>{currentLang.flag}</span>
          <span className="hidden sm:inline">{currentLang.code.toUpperCase()}</span>
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 glass-effect rounded-xl shadow-lg py-2 z-[100]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/50 transition-colors ${
                  lang.code === i18n.language ? 'text-lucid font-medium' : 'text-void'
                }`}
                data-testid={`lang-${lang.code}`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-void/70 hover:text-void transition-colors rounded-xl hover:bg-white/30"
        data-testid="language-selector"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-body">{currentLang.flag} {currentLang.name}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 glass-effect rounded-2xl shadow-xl py-2 z-50 border border-white/20">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-white/50 transition-colors ${
                lang.code === i18n.language ? 'bg-lucid/20 text-void font-medium' : 'text-void/80'
              }`}
              data-testid={`lang-${lang.code}`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="font-body">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
