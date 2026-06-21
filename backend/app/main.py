from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .database import engine, Base, SessionLocal
from .routers import auth, meals, calendar, grocery, family, household, profile, group, admin, weight, requests as meal_requests_router, inbox, vault, invite
from .limiter import limiter
from .seed_data import seed_meals
import os

Base.metadata.create_all(bind=engine)

_PROD = os.getenv("ENVIRONMENT") == "production"

app = FastAPI(
    title="Family Meal Planner API",
    docs_url=None if _PROD else "/docs",
    redoc_url=None if _PROD else "/redoc",
    openapi_url=None if _PROD else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins = []
if not _PROD:
    cors_origins += ["http://localhost:5173", "http://localhost:3000"]
extra_origin = os.getenv("CORS_ORIGIN")
if extra_origin:
    cors_origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(meals.router, prefix="/api/meals", tags=["meals"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
app.include_router(grocery.router, prefix="/api/grocery", tags=["grocery"])
app.include_router(family.router, prefix="/api/family", tags=["family"])
app.include_router(household.router, prefix="/api/household", tags=["household"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(group.router, prefix="/api/group", tags=["group"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(weight.router, prefix="/api/weight", tags=["weight"])
app.include_router(meal_requests_router.router, prefix="/api/meal-requests", tags=["meal-requests"])
app.include_router(inbox.router, prefix="/api/inbox", tags=["inbox"])
app.include_router(vault.router, prefix="/api/vault", tags=["vault"])
app.include_router(invite.router, prefix="/api/invite", tags=["invite"])


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_meals(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
