from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import base64
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 720  # 30 days

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Models
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    is_premium: bool = False
    ai_analysis_count: int = 0
    daily_likes_count: int = 0
    daily_comments_count: int = 0
    last_activity_date: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0
    created_at: datetime

class TokenResponse(BaseModel):
    token: str
    user: User

class DreamTag(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str

class DreamCreate(BaseModel):
    title: str
    content: str
    date: datetime
    tags: List[str] = []
    is_public: bool = False

class DreamUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    human_analysis: Optional[str] = None

class Dream(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    content: str
    date: datetime
    tags: List[str]
    is_public: bool = False
    likes_count: int = 0
    ai_analysis: Optional[str] = None
    ai_analysis_language: Optional[str] = None
    ai_analysis_rating: Optional[int] = None
    human_analysis: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    dream_id: str
    user_id: str
    user_name: str
    content: str
    created_at: datetime

class DreamCircle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    creator_id: str
    creator_name: str
    member_ids: List[str]
    member_count: int
    is_private: bool = False
    created_at: datetime

class CreateCircleRequest(BaseModel):
    name: str
    description: str
    is_private: bool = False

class CircleInviteRequest(BaseModel):
    email_or_username: str

class AIAnalysisRequest(BaseModel):
    dream_id: str

class AIAnalysisLanguageRequest(BaseModel):
    language: str = "english"  # Default to English

class DreamRatingRequest(BaseModel):
    rating: int  # 1-5 stars

class DreamStats(BaseModel):
    total_dreams: int
    dreams_this_week: int
    dreams_this_month: int
    most_common_tags: List[dict]
    recent_dreams: List[Dream]

class CheckoutRequest(BaseModel):
    origin_url: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    session_id: str
    amount: float
    currency: str
    payment_status: str
    metadata: Dict[str, str]
    created_at: datetime
    updated_at: datetime

# Direct Messaging Models
class DirectMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_id: str
    sender_name: str
    recipient_id: str
    recipient_name: str
    content: str
    read: bool = False
    created_at: datetime

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    user_name: str
    last_message: str
    last_message_time: datetime
    unread_count: int

class SendMessageRequest(BaseModel):
    recipient_id: str
    content: str

# Circle Interpretation Models
class CircleInterpretation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    circle_id: str
    dream_id: str
    dream_title: str
    dream_content: str
    user_id: str
    user_name: str
    interpretation: str
    created_at: datetime

class ShareDreamToCircleRequest(BaseModel):
    dream_id: str

class AddInterpretationRequest(BaseModel):
    interpretation: str

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def check_daily_limit(user_id: str, limit_type: str, max_limit: int) -> bool:
    """Check if user has exceeded daily limit for likes or comments"""
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        return False
    
    # Premium users have no limits
    if user_doc.get("is_premium", False):
        return True
    
    # Check if it's a new day (reset counters)
    today = datetime.now(timezone.utc).date().isoformat()
    last_date = user_doc.get("last_activity_date")
    
    if last_date != today:
        # Reset daily counters
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "daily_likes_count": 0,
                "daily_comments_count": 0,
                "last_activity_date": today
            }}
        )
        return True
    
    # Check limit
    current_count = user_doc.get(f"daily_{limit_type}_count", 0)
    return current_count < max_limit

async def increment_daily_counter(user_id: str, limit_type: str):
    """Increment daily counter for likes or comments"""
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {f"daily_{limit_type}_count": 1}}
    )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Authentication Routes
@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserSignup):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "is_premium": False,
        "ai_analysis_count": 0,
        "daily_likes_count": 0,
        "daily_comments_count": 0,
        "last_activity_date": None,
        "followers_count": 0,
        "following_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    user = User(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        is_premium=False,
        ai_analysis_count=0,
        daily_likes_count=0,
        daily_comments_count=0,
        last_activity_date=None,
        followers_count=0,
        following_count=0,
        created_at=datetime.now(timezone.utc)
    )
    
    token = create_token(user_id)
    return TokenResponse(token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user_doc = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user_doc or not verify_password(login_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(
        id=user_doc["id"],
        email=user_doc["email"],
        name=user_doc["name"],
        is_premium=user_doc.get("is_premium", False),
        ai_analysis_count=user_doc.get("ai_analysis_count", 0),
        created_at=datetime.fromisoformat(user_doc["created_at"])
    )
    
    token = create_token(user_doc["id"])
    return TokenResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(
        id=user_doc["id"],
        email=user_doc["email"],
        name=user_doc["name"],
        is_premium=user_doc.get("is_premium", False),
        ai_analysis_count=user_doc.get("ai_analysis_count", 0),
        created_at=datetime.fromisoformat(user_doc["created_at"])
    )

# Forgot Password - sends reset email via Resend
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    # Check if user exists
    user = await db.users.find_one({"email": request.email})
    
    if user:
        # Generate reset token (valid for 1 hour)
        reset_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        # Store reset token in database
        await db.password_resets.delete_many({"email": request.email})  # Remove old tokens
        await db.password_resets.insert_one({
            "email": request.email,
            "token": reset_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Send email via Resend
        try:
            reset_link = f"https://dreamwise.fi/reset-password?token={reset_token}"
            
            resend.Emails.send({
                "from": "DreamWise <onboarding@resend.dev>",
                "to": [request.email],
                "subject": "Reset Your DreamWise Password",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #1a1a2e;">DreamWise</h1>
                    <h2>Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #1a1a2e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">Reset Password</a>
                    </p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="color: #666; word-break: break-all;">{reset_link}</p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">© 2025 DreamWise. All dreams reserved.</p>
                </div>
                """
            })
            logging.info(f"Password reset email sent to {request.email}")
        except Exception as e:
            logging.error(f"Failed to send reset email: {e}")
    
    # Always return success for security (don't reveal if email exists)
    return {"message": "If an account exists with this email, you will receive a password reset link."}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    # Find valid reset token
    reset_record = await db.password_resets.find_one({"token": request.token})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": request.token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Hash new password
    hashed_password = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Update user password
    await db.users.update_one(
        {"email": reset_record["email"]},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    # Delete used token
    await db.password_resets.delete_one({"token": request.token})
    
    return {"message": "Password has been reset successfully"}

# Dream Routes
@api_router.post("/dreams", response_model=Dream)
async def create_dream(dream_data: DreamCreate, user_id: str = Depends(get_current_user)):
    dream_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    dream_doc = {
        "id": dream_id,
        "user_id": user_id,
        "title": dream_data.title,
        "content": dream_data.content,
        "date": dream_data.date.isoformat(),
        "tags": dream_data.tags,
        "ai_analysis": None,
        "human_analysis": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.dreams.insert_one(dream_doc)
    
    return Dream(
        id=dream_id,
        user_id=user_id,
        title=dream_data.title,
        content=dream_data.content,
        date=dream_data.date,
        tags=dream_data.tags,
        ai_analysis=None,
        human_analysis=None,
        created_at=now,
        updated_at=now
    )

@api_router.get("/dreams", response_model=List[Dream])
async def get_dreams(
    user_id: str = Depends(get_current_user),
    tags: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"user_id": user_id}
    
    if tags:
        tag_list = [t.strip() for t in tags.split(',')]
        query["tags"] = {"$in": tag_list}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    dreams = await db.dreams.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    return [
        Dream(
            id=d["id"],
            user_id=d["user_id"],
            title=d["title"],
            content=d["content"],
            date=datetime.fromisoformat(d["date"]),
            tags=d["tags"],
            ai_analysis=d.get("ai_analysis"),
            human_analysis=d.get("human_analysis"),
            created_at=datetime.fromisoformat(d["created_at"]),
            updated_at=datetime.fromisoformat(d["updated_at"])
        )
        for d in dreams
    ]

@api_router.get("/dreams/{dream_id}", response_model=Dream)
async def get_dream(dream_id: str, user_id: str = Depends(get_current_user)):
    dream_doc = await db.dreams.find_one({"id": dream_id, "user_id": user_id}, {"_id": 0})
    if not dream_doc:
        raise HTTPException(status_code=404, detail="Dream not found")
    
    return Dream(
        id=dream_doc["id"],
        user_id=dream_doc["user_id"],
        title=dream_doc["title"],
        content=dream_doc["content"],
        date=datetime.fromisoformat(dream_doc["date"]),
        tags=dream_doc["tags"],
        ai_analysis=dream_doc.get("ai_analysis"),
        human_analysis=dream_doc.get("human_analysis"),
        created_at=datetime.fromisoformat(dream_doc["created_at"]),
        updated_at=datetime.fromisoformat(dream_doc["updated_at"])
    )

@api_router.patch("/dreams/{dream_id}", response_model=Dream)
async def update_dream(
    dream_id: str,
    dream_data: DreamUpdate,
    user_id: str = Depends(get_current_user)
):
    dream_doc = await db.dreams.find_one({"id": dream_id, "user_id": user_id}, {"_id": 0})
    if not dream_doc:
        raise HTTPException(status_code=404, detail="Dream not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if dream_data.title is not None:
        update_data["title"] = dream_data.title
    if dream_data.content is not None:
        update_data["content"] = dream_data.content
    if dream_data.date is not None:
        update_data["date"] = dream_data.date.isoformat()
    if dream_data.tags is not None:
        update_data["tags"] = dream_data.tags
    if dream_data.human_analysis is not None:
        update_data["human_analysis"] = dream_data.human_analysis
    
    await db.dreams.update_one({"id": dream_id}, {"$set": update_data})
    
    updated_dream = await db.dreams.find_one({"id": dream_id}, {"_id": 0})
    
    return Dream(
        id=updated_dream["id"],
        user_id=updated_dream["user_id"],
        title=updated_dream["title"],
        content=updated_dream["content"],
        date=datetime.fromisoformat(updated_dream["date"]),
        tags=updated_dream["tags"],
        ai_analysis=updated_dream.get("ai_analysis"),
        human_analysis=updated_dream.get("human_analysis"),
        created_at=datetime.fromisoformat(updated_dream["created_at"]),
        updated_at=datetime.fromisoformat(updated_dream["updated_at"])
    )

@api_router.delete("/dreams/{dream_id}")
async def delete_dream(dream_id: str, user_id: str = Depends(get_current_user)):
    result = await db.dreams.delete_one({"id": dream_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dream not found")
    return {"message": "Dream deleted successfully"}

# AI Analysis Route
FREE_AI_ANALYSIS_LIMIT = 5
ADMIN_EMAILS = []  # Owner gets unlimited access - will be set on first signup

LANGUAGE_PROMPTS = {
    "english": "You are a compassionate dream analyst with expertise in psychology and symbolism. Provide thoughtful, insightful analysis of dreams in English, exploring potential meanings, symbols, and emotional themes. Be poetic and empathetic in your interpretations.",
    "finnish": "Olet myötätuntoinen unien analysoija, jolla on asiantuntemusta psykologiasta ja symboliikasta. Anna ajattelevia, oivaltavia analyysejä unista suomeksi, tutkien mahdollisia merkityksiä, symboleja ja tunneteemoja. Ole runollinen ja empaattinen tulkinnoissasi.",
    "french": "Vous êtes un analyste de rêves compatissant avec une expertise en psychologie et en symbolisme. Fournissez une analyse réfléchie et perspicace des rêves en français, en explorant les significations potentielles, les symboles et les thèmes émotionnels. Soyez poétique et empathique dans vos interprétations.",
    "german": "Sie sind ein mitfühlender Traumanalytiker mit Fachkenntnissen in Psychologie und Symbolik. Bieten Sie durchdachte, aufschlussreiche Analysen von Träumen auf Deutsch an und erkunden Sie potenzielle Bedeutungen, Symbole und emotionale Themen. Seien Sie poetisch und einfühlsam in Ihren Interpretationen.",
    "spanish": "Eres un analista de sueños compasivo con experiencia en psicología y simbolismo. Proporciona análisis reflexivos y perspicaces de los sueños en español, explorando significados potenciales, símbolos y temas emocionales. Sé poético y empático en tus interpretaciones."
}

@api_router.post("/dreams/{dream_id}/analyze")
async def analyze_dream(
    dream_id: str,
    language_req: AIAnalysisLanguageRequest,
    user_id: str = Depends(get_current_user)
):
    language = language_req.language.lower()
    if language not in LANGUAGE_PROMPTS:
        language = "english"
    
    # Get user info
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is the first registered user (owner) - automatic premium
    first_user = await db.users.find_one({}, {"_id": 0}, sort=[("created_at", 1)])
    is_owner = first_user and first_user["id"] == user_id
    
    # Owner gets automatic premium access
    if is_owner and not user_doc.get("is_premium"):
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_premium": True}}
        )
        user_doc["is_premium"] = True
    
    # Check access: premium, owner, or under free limit
    is_premium = user_doc.get("is_premium", False)
    analysis_count = user_doc.get("ai_analysis_count", 0)
    
    if not is_premium and not is_owner:
        if analysis_count >= FREE_AI_ANALYSIS_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"Free AI analysis limit reached ({FREE_AI_ANALYSIS_LIMIT}/{FREE_AI_ANALYSIS_LIMIT}). Upgrade to Premium for unlimited access."
            )
    
    dream_doc = await db.dreams.find_one({"id": dream_id, "user_id": user_id}, {"_id": 0})
    if not dream_doc:
        raise HTTPException(status_code=404, detail="Dream not found")
    
    # Check if already analyzed in this language
    if dream_doc.get("ai_analysis") and dream_doc.get("ai_analysis_language") == language:
        return {
            "analysis": dream_doc["ai_analysis"], 
            "language": language,
            "cached": True,
            "remaining_free": max(0, FREE_AI_ANALYSIS_LIMIT - analysis_count) if not is_premium else None
        }
    
    try:
        # Use Gemini 3 Flash for analysis with language-specific prompt
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        system_message = LANGUAGE_PROMPTS[language]
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"dream-analysis-{dream_id}-{language}",
            system_message=system_message
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(
            text=f"Please analyze this dream:\n\nTitle: {dream_doc['title']}\n\nDream: {dream_doc['content']}\n\nProvide a detailed analysis covering: symbolic meanings, emotional themes, potential psychological insights, and any recurring patterns or archetypes."
        )
        
        analysis = await chat.send_message(user_message)
        
        # Store the analysis with language
        await db.dreams.update_one(
            {"id": dream_id},
            {"$set": {
                "ai_analysis": analysis,
                "ai_analysis_language": language
            }}
        )
        
        # Increment analysis count for non-premium users
        if not is_premium and not is_owner:
            await db.users.update_one(
                {"id": user_id},
                {"$inc": {"ai_analysis_count": 1}}
            )
            analysis_count += 1
        
        return {
            "analysis": analysis,
            "language": language,
            "cached": False,
            "remaining_free": max(0, FREE_AI_ANALYSIS_LIMIT - analysis_count) if not is_premium else None
        }
    
    except Exception as e:
        logging.error(f"AI Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# Rating Route
@api_router.post("/dreams/{dream_id}/rate")
async def rate_dream_analysis(
    dream_id: str,
    rating_req: DreamRatingRequest,
    user_id: str = Depends(get_current_user)
):
    # Validate rating
    if rating_req.rating < 1 or rating_req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    dream_doc = await db.dreams.find_one({"id": dream_id, "user_id": user_id}, {"_id": 0})
    if not dream_doc:
        raise HTTPException(status_code=404, detail="Dream not found")
    
    # Update rating
    await db.dreams.update_one(
        {"id": dream_id},
        {"$set": {"ai_analysis_rating": rating_req.rating}}
    )
    
    return {"message": "Rating saved", "rating": rating_req.rating}

# AI Artwork Generation Route
@api_router.post("/dreams/{dream_id}/generate-artwork")
async def generate_dream_artwork(dream_id: str, user_id: str = Depends(get_current_user)):
    # Check if user is premium
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user_doc.get("is_premium", False):
        raise HTTPException(
            status_code=403,
            detail="AI Artwork is a premium feature. Please upgrade to access."
        )
    
    dream_doc = await db.dreams.find_one({"id": dream_id, "user_id": user_id}, {"_id": 0})
    if not dream_doc:
        raise HTTPException(status_code=404, detail="Dream not found")
    
    try:
        # Use Gemini Nano Banana for image generation
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"dream-artwork-{dream_id}",
            system_message="You are a surrealist artist inspired by Salvador Dali. Create dreamlike, ethereal, and symbolic artwork."
        ).with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        # Create artistic prompt from dream
        prompt = f"Create a surrealist, dreamlike artwork inspired by this dream: '{dream_doc['title']}'. The dream involves: {dream_doc['content'][:500]}. Use soft ethereal colors (lavender, mint green), dreamlike atmosphere, floating elements, and symbolic imagery in the style of Salvador Dali's melting clocks and elongated elephants."
        
        user_message = UserMessage(text=prompt)
        
        # Get response with image
        text_response, images = await chat.send_message_multimodal_response(user_message)
        
        if images and len(images) > 0:
            # Return the first generated image
            image_data = images[0]
            return {
                "success": True,
                "image": image_data['data'],  # Base64 encoded image
                "mime_type": image_data['mime_type'],
                "message": "Artwork generated successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="No image generated")
    
    except Exception as e:
        logging.error(f"AI Artwork generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Artwork generation failed: {str(e)}")

# Statistics Route
@api_router.get("/dreams/stats/overview", response_model=DreamStats)
async def get_dream_stats(user_id: str = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Total dreams
    total = await db.dreams.count_documents({"user_id": user_id})
    
    # Dreams this week
    week_count = await db.dreams.count_documents({
        "user_id": user_id,
        "date": {"$gte": week_ago.isoformat()}
    })
    
    # Dreams this month
    month_count = await db.dreams.count_documents({
        "user_id": user_id,
        "date": {"$gte": month_ago.isoformat()}
    })
    
    # Most common tags
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    tag_stats = await db.dreams.aggregate(pipeline).to_list(5)
    most_common = [{"tag": t["_id"], "count": t["count"]} for t in tag_stats]
    
    # Recent dreams
    recent = await db.dreams.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).limit(3).to_list(3)
    recent_dreams = [
        Dream(
            id=d["id"],
            user_id=d["user_id"],
            title=d["title"],
            content=d["content"],
            date=datetime.fromisoformat(d["date"]),
            tags=d["tags"],
            ai_analysis=d.get("ai_analysis"),
            human_analysis=d.get("human_analysis"),
            created_at=datetime.fromisoformat(d["created_at"]),
            updated_at=datetime.fromisoformat(d["updated_at"])
        )
        for d in recent
    ]
    
    return DreamStats(
        total_dreams=total,
        dreams_this_week=week_count,
        dreams_this_month=month_count,
        most_common_tags=most_common,
        recent_dreams=recent_dreams
    )

# Social Platform Routes

# Public Feed
@api_router.get("/feed")
async def get_public_feed(
    skip: int = 0,
    limit: int = 20,
    user_id: str = Depends(get_current_user)
):
    """Get public dreams feed"""
    # Get public dreams sorted by recent
    dreams = await db.dreams.find(
        {"is_public": True},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get user info for each dream
    feed_items = []
    for dream in dreams:
        user = await db.users.find_one({"id": dream["user_id"]}, {"_id": 0, "name": 1, "is_premium": 1})
        
        # Check if current user liked this dream
        like = await db.likes.find_one({"dream_id": dream["id"], "user_id": user_id}, {"_id": 0})
        
        feed_items.append({
            **dream,
            "user_name": user.get("name", "Unknown") if user else "Unknown",
            "user_is_premium": user.get("is_premium", False) if user else False,
            "liked_by_me": like is not None
        })
    
    return feed_items

# Like Dream
@api_router.post("/dreams/{dream_id}/like")
async def like_dream(dream_id: str, user_id: str = Depends(get_current_user)):
    """Like or unlike a dream"""
    # Check if dream exists and is public
    dream = await db.dreams.find_one({"id": dream_id, "is_public": True}, {"_id": 0})
    if not dream:
        raise HTTPException(status_code=404, detail="Dream not found or not public")
    
    # Check if already liked
    existing_like = await db.likes.find_one({"dream_id": dream_id, "user_id": user_id}, {"_id": 0})
    
    if existing_like:
        # Unlike
        await db.likes.delete_one({"dream_id": dream_id, "user_id": user_id})
        await db.dreams.update_one({"id": dream_id}, {"$inc": {"likes_count": -1}})
        return {"message": "Dream unliked", "liked": False}
    else:
        # Check daily limit
        can_like = await check_daily_limit(user_id, "likes", 10)
        if not can_like:
            raise HTTPException(
                status_code=403,
                detail="Daily like limit reached (10/day). Upgrade to Premium for unlimited likes!"
            )
        
        # Like
        like_doc = {
            "id": str(uuid.uuid4()),
            "dream_id": dream_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.likes.insert_one(like_doc)
        await db.dreams.update_one({"id": dream_id}, {"$inc": {"likes_count": 1}})
        await increment_daily_counter(user_id, "likes")
        
        return {"message": "Dream liked", "liked": True}

# Get Comments
@api_router.get("/dreams/{dream_id}/comments")
async def get_comments(dream_id: str, user_id: str = Depends(get_current_user)):
    """Get comments for a dream"""
    comments = await db.comments.find({"dream_id": dream_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return comments

# Add Comment
@api_router.post("/dreams/{dream_id}/comments")
async def add_comment(
    dream_id: str,
    content: str,
    user_id: str = Depends(get_current_user)
):
    """Add a comment to a dream"""
    # Check if dream exists and is public
    dream = await db.dreams.find_one({"id": dream_id, "is_public": True}, {"_id": 0})
    if not dream:
        raise HTTPException(status_code=404, detail="Dream not found or not public")
    
    # Check daily limit
    can_comment = await check_daily_limit(user_id, "comments", 3)
    if not can_comment:
        raise HTTPException(
            status_code=403,
            detail="Daily comment limit reached (3/day). Upgrade to Premium for unlimited comments!"
        )
    
    # Get user name
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1})
    
    # Create comment
    comment_doc = {
        "id": str(uuid.uuid4()),
        "dream_id": dream_id,
        "user_id": user_id,
        "user_name": user.get("name", "Unknown") if user else "Unknown",
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.comments.insert_one(comment_doc)
    await increment_daily_counter(user_id, "comments")
    
    return comment_doc

# Follow User
@api_router.post("/users/{target_user_id}/follow")
async def follow_user(target_user_id: str, user_id: str = Depends(get_current_user)):
    """Follow or unfollow a user"""
    if target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if target user exists
    target_user = await db.users.find_one({"id": target_user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already following
    existing_follow = await db.follows.find_one({"follower_id": user_id, "following_id": target_user_id}, {"_id": 0})
    
    if existing_follow:
        # Unfollow
        await db.follows.delete_one({"follower_id": user_id, "following_id": target_user_id})
        await db.users.update_one({"id": user_id}, {"$inc": {"following_count": -1}})
        await db.users.update_one({"id": target_user_id}, {"$inc": {"followers_count": -1}})
        return {"message": "Unfollowed", "following": False}
    else:
        # Check follow limit for free users
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user_doc.get("is_premium", False):
            following_count = user_doc.get("following_count", 0)
            if following_count >= 20:
                raise HTTPException(
                    status_code=403,
                    detail="Follow limit reached (20 max). Upgrade to Premium for unlimited follows!"
                )
        
        # Follow
        follow_doc = {
            "id": str(uuid.uuid4()),
            "follower_id": user_id,
            "following_id": target_user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.follows.insert_one(follow_doc)
        await db.users.update_one({"id": user_id}, {"$inc": {"following_count": 1}})
        await db.users.update_one({"id": target_user_id}, {"$inc": {"followers_count": 1}})
        
        return {"message": "Followed", "following": True}

# Get User Profile
@api_router.get("/users/{profile_user_id}/profile")
async def get_user_profile(profile_user_id: str, user_id: str = Depends(get_current_user)):
    """Get user profile with their public dreams"""
    user = await db.users.find_one({"id": profile_user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if current user follows this user
    follow = await db.follows.find_one({"follower_id": user_id, "following_id": profile_user_id}, {"_id": 0})
    
    # Get user's public dreams
    dreams = await db.dreams.find(
        {"user_id": profile_user_id, "is_public": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "user": user,
        "following": follow is not None,
        "public_dreams": dreams
    }

# Dream Circles
@api_router.get("/circles")
async def get_circles(user_id: str = Depends(get_current_user)):
    """Get all public circles and user's circles"""
    circles = await db.circles.find(
        {"$or": [{"is_private": False}, {"member_ids": user_id}]},
        {"_id": 0}
    ).to_list(100)
    return circles

@api_router.post("/circles")
async def create_circle(
    circle_req: CreateCircleRequest,
    user_id: str = Depends(get_current_user)
):
    """Create a dream circle (premium only)"""
    # Check if user is premium
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_premium", False):
        raise HTTPException(
            status_code=403,
            detail="Creating circles is a premium feature. Upgrade to Premium!"
        )
    
    # Create circle
    circle_id = str(uuid.uuid4())
    circle_doc = {
        "id": circle_id,
        "name": circle_req.name,
        "description": circle_req.description,
        "creator_id": user_id,
        "creator_name": user.get("name", "Unknown"),
        "member_ids": [user_id],
        "member_count": 1,
        "is_private": circle_req.is_private,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.circles.insert_one(circle_doc)
    
    # Return without _id
    circle_doc.pop("_id", None)
    return circle_doc

@api_router.post("/circles/{circle_id}/join")
async def join_circle(circle_id: str, user_id: str = Depends(get_current_user)):
    """Join or leave a dream circle"""
    circle = await db.circles.find_one({"id": circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    member_ids = circle.get("member_ids", [])
    
    if user_id in member_ids:
        # Leave circle
        await db.circles.update_one(
            {"id": circle_id},
            {
                "$pull": {"member_ids": user_id},
                "$inc": {"member_count": -1}
            }
        )
        return {"message": "Left circle", "joined": False}
    else:
        # Check circle limit for free users
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user.get("is_premium", False):
            # Count user's circles
            user_circles = await db.circles.count_documents({"member_ids": user_id})
            if user_circles >= 3:
                raise HTTPException(
                    status_code=403,
                    detail="Circle limit reached (3 max). Upgrade to Premium for unlimited circles!"
                )
        
        # Join circle
        await db.circles.update_one(
            {"id": circle_id},
            {
                "$push": {"member_ids": user_id},
                "$inc": {"member_count": 1}
            }
        )
        return {"message": "Joined circle", "joined": True}

# Circle Collaborative Interpretation Routes
@api_router.post("/circles/{circle_id}/dreams")
async def share_dream_to_circle(circle_id: str, request: ShareDreamToCircleRequest, user_id: str = Depends(get_current_user)):
    """Share a dream to a circle for collaborative interpretation"""
    # Check if circle exists and user is a member
    circle = await db.circles.find_one({"id": circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if user_id not in circle.get("member_ids", []):
        raise HTTPException(status_code=403, detail="You must be a member of this circle to share dreams")
    
    # Get the dream
    dream = await db.dreams.find_one({"id": request.dream_id, "user_id": user_id}, {"_id": 0})
    if not dream:
        raise HTTPException(status_code=404, detail="Dream not found")
    
    # Check if already shared
    existing = await db.circle_dreams.find_one({"circle_id": circle_id, "dream_id": request.dream_id})
    if existing:
        raise HTTPException(status_code=400, detail="Dream already shared to this circle")
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1})
    
    # Create circle dream entry
    now = datetime.now(timezone.utc)
    circle_dream_doc = {
        "id": str(uuid.uuid4()),
        "circle_id": circle_id,
        "dream_id": request.dream_id,
        "dream_title": dream["title"],
        "dream_content": dream["content"],
        "dream_tags": dream.get("tags", []),
        "user_id": user_id,
        "user_name": user["name"],
        "interpretations": [],
        "created_at": now
    }
    
    await db.circle_dreams.insert_one(circle_dream_doc)
    
    return {
        "id": circle_dream_doc["id"],
        "circle_id": circle_dream_doc["circle_id"],
        "dream_id": circle_dream_doc["dream_id"],
        "dream_title": circle_dream_doc["dream_title"],
        "user_name": circle_dream_doc["user_name"],
        "created_at": circle_dream_doc["created_at"].isoformat()
    }

@api_router.get("/circles/{circle_id}/dreams")
async def get_circle_dreams(circle_id: str, user_id: str = Depends(get_current_user)):
    """Get all dreams shared to a circle"""
    # Check if circle exists and user is a member
    circle = await db.circles.find_one({"id": circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if user_id not in circle.get("member_ids", []):
        raise HTTPException(status_code=403, detail="You must be a member of this circle to view dreams")
    
    dreams = await db.circle_dreams.find(
        {"circle_id": circle_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Convert datetime to ISO string
    for dream in dreams:
        if isinstance(dream.get("created_at"), datetime):
            dream["created_at"] = dream["created_at"].isoformat()
        for interp in dream.get("interpretations", []):
            if isinstance(interp.get("created_at"), datetime):
                interp["created_at"] = interp["created_at"].isoformat()
    
    return dreams

@api_router.post("/circles/{circle_id}/dreams/{dream_id}/interpretations")
async def add_interpretation(circle_id: str, dream_id: str, request: AddInterpretationRequest, user_id: str = Depends(get_current_user)):
    """Add a collaborative interpretation to a shared dream"""
    # Check if circle exists and user is a member
    circle = await db.circles.find_one({"id": circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if user_id not in circle.get("member_ids", []):
        raise HTTPException(status_code=403, detail="You must be a member of this circle to add interpretations")
    
    # Check if circle dream exists
    circle_dream = await db.circle_dreams.find_one({"circle_id": circle_id, "dream_id": dream_id}, {"_id": 0})
    if not circle_dream:
        raise HTTPException(status_code=404, detail="Dream not found in this circle")
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "is_premium": 1})
    
    # Create interpretation
    now = datetime.now(timezone.utc)
    interpretation = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user["name"],
        "is_premium": user.get("is_premium", False),
        "interpretation": request.interpretation,
        "created_at": now
    }
    
    # Add interpretation to circle dream
    await db.circle_dreams.update_one(
        {"circle_id": circle_id, "dream_id": dream_id},
        {"$push": {"interpretations": interpretation}}
    )
    
    return {
        "id": interpretation["id"],
        "user_id": interpretation["user_id"],
        "user_name": interpretation["user_name"],
        "is_premium": interpretation["is_premium"],
        "interpretation": interpretation["interpretation"],
        "created_at": interpretation["created_at"].isoformat()
    }

# Direct Messaging Routes
@api_router.get("/messages/conversations")
async def get_conversations(user_id: str = Depends(get_current_user)):
    """Get all conversations for the current user"""
    # Find all messages where user is sender or recipient
    pipeline = [
        {
            "$match": {
                "$or": [{"sender_id": user_id}, {"recipient_id": user_id}]
            }
        },
        {"$sort": {"created_at": -1}},
        {
            "$group": {
                "_id": {
                    "$cond": [
                        {"$eq": ["$sender_id", user_id]},
                        "$recipient_id",
                        "$sender_id"
                    ]
                },
                "other_user_name": {
                    "$first": {
                        "$cond": [
                            {"$eq": ["$sender_id", user_id]},
                            "$recipient_name",
                            "$sender_name"
                        ]
                    }
                },
                "last_message": {"$first": "$content"},
                "last_message_time": {"$first": "$created_at"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$recipient_id", user_id]},
                                {"$eq": ["$read", False]}
                            ]},
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {"$sort": {"last_message_time": -1}}
    ]
    
    conversations = await db.messages.aggregate(pipeline).to_list(100)
    
    return [
        {
            "user_id": conv["_id"],
            "user_name": conv["other_user_name"],
            "last_message": conv["last_message"],
            "last_message_time": conv["last_message_time"].isoformat() if conv["last_message_time"] else None,
            "unread_count": conv["unread_count"]
        }
        for conv in conversations
    ]

@api_router.get("/messages/{other_user_id}")
async def get_messages(other_user_id: str, user_id: str = Depends(get_current_user)):
    """Get all messages between current user and another user"""
    messages = await db.messages.find(
        {
            "$or": [
                {"sender_id": user_id, "recipient_id": other_user_id},
                {"sender_id": other_user_id, "recipient_id": user_id}
            ]
        },
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": other_user_id, "recipient_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return messages

@api_router.post("/messages")
async def send_message(message_req: SendMessageRequest, user_id: str = Depends(get_current_user)):
    """Send a direct message to another user"""
    # Get sender info
    sender = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1})
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    # Get recipient info
    recipient = await db.users.find_one({"id": message_req.recipient_id}, {"_id": 0, "name": 1})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Prevent sending to self
    if user_id == message_req.recipient_id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")
    
    # Create message
    now = datetime.now(timezone.utc)
    message_doc = {
        "id": str(uuid.uuid4()),
        "sender_id": user_id,
        "sender_name": sender["name"],
        "recipient_id": message_req.recipient_id,
        "recipient_name": recipient["name"],
        "content": message_req.content,
        "read": False,
        "created_at": now
    }
    
    await db.messages.insert_one(message_doc)
    
    return {
        "id": message_doc["id"],
        "sender_id": message_doc["sender_id"],
        "sender_name": message_doc["sender_name"],
        "recipient_id": message_doc["recipient_id"],
        "recipient_name": message_doc["recipient_name"],
        "content": message_doc["content"],
        "read": message_doc["read"],
        "created_at": message_doc["created_at"].isoformat()
    }

@api_router.get("/users/search")
async def search_users(q: str, user_id: str = Depends(get_current_user)):
    """Search for users by name"""
    if not q or len(q) < 2:
        return []
    
    users = await db.users.find(
        {
            "id": {"$ne": user_id},  # Exclude current user
            "name": {"$regex": q, "$options": "i"}
        },
        {"_id": 0, "id": 1, "name": 1, "is_premium": 1}
    ).limit(10).to_list(10)
    
    return users

# Payment Routes
PREMIUM_PACKAGES = {
    "monthly": {"amount": 9.99, "name": "Premium Monthly", "description": "AI dream analysis for 30 days"},
    "lifetime": {"amount": 29.99, "name": "Premium Lifetime", "description": "Unlimited AI dream analysis forever"}
}

@api_router.post("/payments/checkout")
async def create_checkout(
    package_id: str,
    checkout_req: CheckoutRequest,
    user_id: str = Depends(get_current_user)
):
    # Validate package
    if package_id not in PREMIUM_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    package = PREMIUM_PACKAGES[package_id]
    
    # Initialize Stripe
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    webhook_url = f"{checkout_req.origin_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create success and cancel URLs
    success_url = f"{checkout_req.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_req.origin_url}/dashboard"
    
    # Create checkout session request
    session_request = CheckoutSessionRequest(
        amount=package["amount"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user_id,
            "package_id": package_id,
            "package_name": package["name"]
        },
        payment_methods=["card", "klarna"]
    )
    
    # Create checkout session
    session = await stripe_checkout.create_checkout_session(session_request)
    
    # Store transaction in database
    transaction_id = str(uuid.uuid4())
    transaction_doc = {
        "id": transaction_id,
        "user_id": user_id,
        "session_id": session.session_id,
        "amount": package["amount"],
        "currency": "usd",
        "package_id": package_id,
        "payment_status": "pending",
        "metadata": session_request.metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def check_payment_status(session_id: str, user_id: str = Depends(get_current_user)):
    # Check if we already processed this payment
    transaction = await db.payment_transactions.find_one({
        "session_id": session_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already processed as paid, return cached status
    if transaction.get("payment_status") == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "message": "Payment already processed"
        }
    
    # Check with Stripe
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        checkout_status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": checkout_status.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # If payment successful and not yet processed, upgrade user to premium
        if checkout_status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"is_premium": True}}
            )
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount": checkout_status.amount_total / 100,  # Convert from cents
            "currency": checkout_status.currency
        }
    
    except Exception as e:
        logging.error(f"Payment status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process the webhook event
        if webhook_response.payment_status == "paid":
            user_id = webhook_response.metadata.get("user_id")
            session_id = webhook_response.session_id
            
            # Check if already processed
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            
            if transaction and transaction.get("payment_status") != "paid":
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Upgrade user to premium
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {"is_premium": True}}
                )
        
        return {"status": "success"}
    
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()