# DreamWise - Dream Tracking Application PRD

## Original Problem Statement
Build a dream-tracking application with the following features:
1. Landing page with poetic, oniric, and surrealistic design (inspired by Salvador Dali)
2. Section to write down, edit, and delete dreams
3. AI-powered analysis for dreams (using Gemini 3 Flash)
4. Human analysis section
5. User authentication and private accounts
6. Tags (including visually distinct 'nightmare' tag), search/filter, and dream statistics
7. Premium subscription model via Stripe with Klarna payment option
8. Pricing: $9.99/month and $29.99/lifetime
9. Freemium model: 5 free AI analyses for new users
10. Free, permanent premium account for app owner
11. Google Analytics integration
12. Star rating system (1-5) for AI analysis
13. Multi-language support for AI analysis (Finnish, French, German, English)
14. Shareable dream cards (CSS/Canvas generated)
15. Premium-only AI-artistic dream cards (Gemini Nano Banana)
16. Social platform ("Connect with Other Dreamers") with freemium model
17. **Multi-language UI support** (English, French, Finnish, Spanish, German)

## User Personas
- **Casual Dreamers**: Users who want to record and understand their dreams
- **Dream Enthusiasts**: Active users interested in AI analysis and community features
- **Premium Users**: Users who want unlimited AI analyses, artwork generation, and circle creation
- **International Users**: Users from different countries preferring their native language

## Core Requirements
### Authentication
- Email/password signup and login
- JWT-based authentication
- Premium status tracking

### Dream Journal
- Create, edit, delete dreams
- Tag system with nightmare highlight
- Public/private toggle for dreams
- Search and filter capabilities

### AI Analysis
- Multi-language support (EN, FI, FR, DE)
- Star rating system (1-5)
- Freemium model (5 free analyses)
- Premium unlimited access

### Premium Features
- Stripe payment integration with Klarna
- Monthly ($9.99) and Lifetime ($29.99) plans
- AI artwork generation
- Create Dream Circles
- Unlimited likes/comments

### Social Platform
- Community Feed (public dreams)
- Dream Circles (groups)
- Like and comment system
- Follow functionality
- Daily limits for free users

### Internationalization (i18n)
- Full UI translation support
- Languages: English, French, Finnish, Spanish, German
- Browser language auto-detection
- Language preference persisted in localStorage
- "DreamWise" branding kept in English

## What's Been Implemented

### Completed Features (as of Jan 31, 2026)
- [x] Surrealist landing page with beautiful design
- [x] User authentication (signup, login, JWT)
- [x] Dream journal CRUD operations
- [x] Tag system with nightmare highlighting
- [x] Public/private toggle for dreams
- [x] AI dream analysis (Gemini 3 Flash)
- [x] Multi-language AI analysis
- [x] Star rating for AI analysis
- [x] Shareable dream cards (CSS/Canvas)
- [x] AI artwork generation (Premium - Nano Banana)
- [x] Stripe payment integration
- [x] Premium subscription system
- [x] Community Feed page
- [x] Dream Circles page
- [x] Like/comment functionality
- [x] Community Hub page - Central navigation for social features
- [x] **Multi-language UI** - Full i18n support with 5 languages (EN, FR, FI, ES, DE)
- [x] **Direct Messaging** - Real-time chat between users with conversation list
- [x] **Collaborative Dream Interpretation** - Circle members can share dreams and add interpretations
- [x] **Google Analytics** - Configuration ready (requires user's GA Measurement ID)

### Latest Update (Jan 31, 2026)
- Full multi-language support for entire UI (5 languages)
- Direct messaging system with user search and conversations
- Collaborative interpretation feature for Dream Circles
- Google Analytics configuration (environment variable ready)

## Architecture

### Tech Stack
- **Frontend**: React with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT
- **Payments**: Stripe
- **AI**: Emergent LLM Key (Gemini 3 Flash, Nano Banana)
- **i18n**: react-i18next with browser language detection

### Key Files
- `/app/backend/server.py` - All backend routes
- `/app/frontend/src/App.js` - Main router
- `/app/frontend/src/i18n/index.js` - i18n configuration
- `/app/frontend/src/i18n/locales/` - Translation files (en, fr, fi, es, de)
- `/app/frontend/src/components/LanguageSelector.js` - Language picker component
- `/app/frontend/src/pages/CommunityHub.js` - Community hub
- `/app/frontend/src/pages/CommunityFeed.js` - Social feed
- `/app/frontend/src/pages/DreamCircles.js` - Circles page

### API Endpoints
- `/api/auth/signup`, `/api/auth/login`
- `/api/dreams`, `/api/dreams/{id}`
- `/api/dreams/{id}/analyze`
- `/api/dreams/{id}/generate-artwork`
- `/api/payments/checkout`
- `/api/feed`
- `/api/circles`, `/api/circles/{id}/join`
- `/api/dreams/{id}/like`, `/api/dreams/{id}/comments`

## Prioritized Backlog

### P0 (Critical)
- [x] Community Hub page (COMPLETED)
- [x] Multi-language UI (COMPLETED)
- [x] Direct Messaging (COMPLETED)
- [x] Collaborative Dream Interpretation (COMPLETED)
- [x] Google Analytics Configuration (COMPLETED - needs user's GA ID)

### P1 (High Priority)
- [ ] User profiles with dream statistics
- [ ] Test social platform freemium limits

### P2 (Medium Priority)  
- [ ] Add translations to DreamDetail page

### P3 (Low Priority)
- [ ] Refactor social routes into separate file

## Known Issues
- **Deployment Pipeline**: Live site may not update immediately after redeploy (platform issue, not code)
- Use preview environment for testing: https://slumbervision.preview.emergentagent.com

## Test Credentials
- Email: `testhub@dreamwise.com`
- Password: `password123`
