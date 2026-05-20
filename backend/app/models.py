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
    household_settings = relationship("HouseholdSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    day_guests = relationship("DayGuests", back_populates="user", cascade="all, delete-orphan")


class FamilyMember(Base):
    __tablename__ = "family_members"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    allergies = Column(JSON, default=list)       # e.g. ["nuts", "dairy"]
    foods_to_avoid = Column(JSON, default=list)  # e.g. ["broccoli", "mushrooms"]
    food_preferences = Column(JSON, default=list)  # e.g. ["vegetarian", "low-carb"]
    user = relationship("User", back_populates="family_members")


class HouseholdSettings(Base):
    __tablename__ = "household_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    num_adults = Column(Integer, default=2)
    num_children = Column(Integer, default=0)
    num_toddlers = Column(Integer, default=0)
    user = relationship("User", back_populates="household_settings")


class DayGuests(Base):
    __tablename__ = "day_guests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    adult_guests = Column(Integer, default=0)
    child_guests = Column(Integer, default=0)
    user = relationship("User", back_populates="day_guests")


class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    instructions = Column(Text)
    meal_type = Column(String)  # breakfast, lunch, dinner, snack, beverage, any
    prep_time = Column(Integer)
    cook_time = Column(Integer)
    servings = Column(Integer)
    calories = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fats_g = Column(Float, nullable=True)
    iron_mg = Column(Float, nullable=True)
    calcium_mg = Column(Float, nullable=True)
    vitamin_c_mg = Column(Float, nullable=True)
    vitamin_d_iu = Column(Float, nullable=True)
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
