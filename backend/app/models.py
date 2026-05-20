from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Text, Float, JSON
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    is_guest = Column(Boolean, default=False)
    meal_plans = relationship("MealPlan", back_populates="user", cascade="all, delete-orphan")
    family_members = relationship("FamilyMember", back_populates="user", cascade="all, delete-orphan")


class FamilyMember(Base):
    __tablename__ = "family_members"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    allergies = Column(JSON, default=list)       # e.g. ["nuts", "dairy"]
    foods_to_avoid = Column(JSON, default=list)  # e.g. ["broccoli", "mushrooms"]
    food_preferences = Column(JSON, default=list)  # e.g. ["vegetarian", "low-carb"]
    user = relationship("User", back_populates="family_members")


class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    instructions = Column(Text)
    meal_type = Column(String)  # breakfast, lunch, dinner, any
    prep_time = Column(Integer)
    cook_time = Column(Integer)
    servings = Column(Integer)
    ingredients = relationship("MealIngredient", back_populates="meal", cascade="all, delete-orphan")
    meal_plans = relationship("MealPlan", back_populates="meal")


class MealIngredient(Base):
    __tablename__ = "meal_ingredients"
    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"))
    name = Column(String)
    quantity = Column(Float)
    unit = Column(String)
    category = Column(String)  # produce, dairy, meat, grains, pantry
    meal = relationship("Meal", back_populates="ingredients")


class MealPlan(Base):
    __tablename__ = "meal_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    week_start = Column(Date)
    day_of_week = Column(Integer)  # 0=Mon, 6=Sun
    meal_slot = Column(String)  # breakfast, lunch, dinner
    meal_id = Column(Integer, ForeignKey("meals.id"))
    user = relationship("User", back_populates="meal_plans")
    meal = relationship("Meal", back_populates="meal_plans")
