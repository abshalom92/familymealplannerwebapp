from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Text, Float, JSON, DateTime
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    is_guest = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    calorie_goal = Column(Integer, nullable=True)
    protein_goal_g = Column(Integer, nullable=True)
    carbs_goal_g = Column(Integer, nullable=True)
    fats_goal_g = Column(Integer, nullable=True)
    dietary_notes = Column(Text, nullable=True)
    age = Column(Integer, nullable=True)
    weight_lbs = Column(Float, nullable=True)
    timezone = Column(String, nullable=True)
    meal_plans = relationship("MealPlan", back_populates="user", cascade="all, delete-orphan")
    family_members = relationship("FamilyMember", back_populates="user", cascade="all, delete-orphan")
    household_settings = relationship("HouseholdSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    day_guests = relationship("DayGuests", back_populates="user", cascade="all, delete-orphan")
    family_group_membership = relationship("FamilyGroupMember", back_populates="user", uselist=False, cascade="all, delete-orphan")
    weight_entries = relationship("WeightEntry", back_populates="user", cascade="all, delete-orphan")
    sent_requests = relationship("MealRequest", foreign_keys="[MealRequest.requester_id]", cascade="all, delete-orphan")
    notifications = relationship("Notification", foreign_keys="[Notification.user_id]", cascade="all, delete-orphan")


class InviteCode(Base):
    __tablename__ = "invite_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(16), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    used = Column(Boolean, default=False)
    used_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sent_to_email = Column(String, nullable=True)
    email_sent_at = Column(DateTime, nullable=True)


class FamilyGroup(Base):
    __tablename__ = "family_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    join_code = Column(String(8), unique=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    planner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    planner_claimed_at = Column(DateTime, nullable=True)
    members = relationship("FamilyGroupMember", back_populates="group", cascade="all, delete-orphan")
    planner = relationship("User", foreign_keys=[planner_id])


class FamilyGroupMember(Base):
    __tablename__ = "family_group_members"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("family_groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    is_head = Column(Boolean, default=False)
    status = Column(String, default='approved')  # 'pending' | 'approved'
    group = relationship("FamilyGroup", back_populates="members")
    user = relationship("User", back_populates="family_group_membership")


class FamilyMember(Base):
    __tablename__ = "family_members"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    allergies = Column(JSON, default=list)
    foods_to_avoid = Column(JSON, default=list)
    food_preferences = Column(JSON, default=list)
    weight_lbs = Column(Float, nullable=True)
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


class WeightEntry(Base):
    __tablename__ = "weight_entries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    weight_lbs = Column(Float, nullable=False)
    logged_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="weight_entries")


class MealRequest(Base):
    __tablename__ = "meal_requests"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("family_groups.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    day_of_week = Column(Integer, nullable=False)
    meal_slot = Column(String, nullable=False)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    status = Column(String, default='pending')  # pending | accepted | denied
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    requester = relationship("User", foreign_keys=[requester_id])
    meal = relationship("Meal")
    group = relationship("FamilyGroup")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    data = Column(JSON, nullable=True)
    user = relationship("User", foreign_keys=[user_id])


class MealPlan(Base):
    __tablename__ = "meal_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    week_start = Column(Date)
    day_of_week = Column(Integer)  # 0=Mon, 6=Sun
    meal_slot = Column(String)  # breakfast, lunch, dinner
    meal_id = Column(Integer, ForeignKey("meals.id"))
    substitutions = Column(JSON, default=dict)  # {original_name: {name, category}}
    user = relationship("User", back_populates="meal_plans")
    meal = relationship("Meal", back_populates="meal_plans")

    @property
    def planned_by(self):
        return self.user.username if self.user else None


class Badge(Base):
    __tablename__ = "badges"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    category = Column(String(20), nullable=False)   # 'family' | 'individual'
    trigger_type = Column(String(40), unique=True, nullable=False)
    icon = Column(String(20), nullable=True)


class FamilyBadge(Base):
    __tablename__ = "family_badges"
    id = Column(Integer, primary_key=True, index=True)
    family_group_id = Column(Integer, ForeignKey("family_groups.id", ondelete="CASCADE"), nullable=False)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)
    badge = relationship("Badge")


class UserBadge(Base):
    __tablename__ = "user_badges"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)
    badge = relationship("Badge")


class VaultEntry(Base):
    __tablename__ = "vault_entries"
    id = Column(Integer, primary_key=True, index=True)
    family_group_id = Column(Integer, ForeignKey("family_groups.id"), nullable=False)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    added_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    storage_method = Column(String, nullable=False)
    servings_total = Column(Integer, nullable=False)
    servings_remaining = Column(Integer, nullable=False)
    date_added = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=False)
    expiry_notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    meal = relationship("Meal")
    added_by = relationship("User", foreign_keys=[added_by_user_id])

    @property
    def status(self):
        from datetime import date as _date, timedelta
        today = _date.today()
        if self.servings_remaining <= 0:
            return "used_up"
        if self.expiration_date < today:
            return "expired"
        from .shelf_life import NOTIFY_DAYS_BEFORE
        threshold = NOTIFY_DAYS_BEFORE.get(self.storage_method, 2)
        if self.expiration_date <= today + timedelta(days=threshold):
            return "expiring_soon"
        return "fresh"
