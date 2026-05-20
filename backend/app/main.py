from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .routers import auth, meals, calendar, grocery, family, household
from .seed_data import seed_meals

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Family Meal Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
