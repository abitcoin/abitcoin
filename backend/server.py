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
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

class DreamUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    human_analysis: Optional[str] = None

class Dream(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    content: str
    date: datetime
    tags: List[str]
    ai_analysis: Optional[str] = None
    human_analysis: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class AIAnalysisRequest(BaseModel):
    dream_id: str

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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    user = User(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        is_premium=False,
        ai_analysis_count=0,
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
        created_at=datetime.fromisoformat(user_doc["created_at"])
    )

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
@api_router.post("/dreams/{dream_id}/analyze")
async def analyze_dream(dream_id: str, user_id: str = Depends(get_current_user)):
    # Check if user is premium
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user_doc.get("is_premium", False):
        raise HTTPException(
            status_code=403,
            detail="Premium subscription required. Please upgrade to access AI dream analysis."
        )
    
    dream_doc = await db.dreams.find_one({"id": dream_id, "user_id": user_id}, {"_id": 0})
    if not dream_doc:
        raise HTTPException(status_code=404, detail="Dream not found")
    
    # Check if already analyzed
    if dream_doc.get("ai_analysis"):
        return {"analysis": dream_doc["ai_analysis"], "cached": True}
    
    try:
        # Use Gemini 3 Flash for analysis
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"dream-analysis-{dream_id}",
            system_message="You are a compassionate dream analyst with expertise in psychology and symbolism. Provide thoughtful, insightful analysis of dreams, exploring potential meanings, symbols, and emotional themes. Be poetic and empathetic in your interpretations."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(
            text=f"Please analyze this dream:\n\nTitle: {dream_doc['title']}\n\nDream: {dream_doc['content']}\n\nProvide a detailed analysis covering: symbolic meanings, emotional themes, potential psychological insights, and any recurring patterns or archetypes."
        )
        
        analysis = await chat.send_message(user_message)
        
        # Store the analysis
        await db.dreams.update_one(
            {"id": dream_id},
            {"$set": {"ai_analysis": analysis}}
        )
        
        return {"analysis": analysis, "cached": False}
    
    except Exception as e:
        logging.error(f"AI Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

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

# Payment Routes
PREMIUM_PACKAGES = {
    "monthly": {"amount": 9.99, "name": "Premium Monthly", "description": "AI dream analysis for 30 days"},
    "lifetime": {"amount": 49.99, "name": "Premium Lifetime", "description": "Unlimited AI dream analysis forever"}
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
        }
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