from pydantic import BaseModel, Field, EmailStr, model_validator, field_validator
from typing import Optional, List, Literal
from datetime import date, datetime


_MEAL_SLOTS = Literal["breakfast", "lunch", "dinner", "snack", "beverage"]


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=30)
    email: Optional[EmailStr] = None
    password: str
    invite_code: str = Field(min_length=1, max_length=32)

    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        errors = []
        if len(v) < 8:
            errors.append('at least 8 characters')
        if not any(c.isupper() for c in v):
            errors.append('one uppercase letter')
        if not any(c.isdigit() for c in v):
            errors.append('one number')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            errors.append('one special character (!@#$%^&*...)')
        if errors:
            raise ValueError('Password must contain: ' + ', '.join(errors))
        return v


class UserLogin(BaseModel):
    username: str = Field(min_length=1, max_length=30)
    password: str = Field(min_length=1, max_length=256)


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    is_guest: bool


class IngredientOut(BaseModel):
    id: int
    name: str
    quantity: float
    unit: str
    category: str

    class Config:
        from_attributes = True


class MealOut(BaseModel):
    id: int
    name: str
    description: str
    instructions: str
    meal_type: str
    prep_time: int
    cook_time: int
    servings: int
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fats_g: Optional[float] = None
    iron_mg: Optional[float] = None
    calcium_mg: Optional[float] = None
    vitamin_c_mg: Optional[float] = None
    vitamin_d_iu: Optional[float] = None
    ingredients: List[IngredientOut] = []

    class Config:
        from_attributes = True


class MealPlanCreate(BaseModel):
    week_start: date
    day_of_week: int = Field(ge=0, le=6)
    meal_slot: _MEAL_SLOTS
    meal_id: int = Field(gt=0)


class MealPlanOut(BaseModel):
    id: int
    week_start: date
    day_of_week: int
    meal_slot: str
    meal_id: int
    meal: MealOut
    planned_by: Optional[str] = None
    substitutions: Optional[dict] = None

    class Config:
        from_attributes = True


class AutofillRequest(BaseModel):
    week_start: date
    slots: List[_MEAL_SLOTS]
    overwrite: bool = False


class GroceryItem(BaseModel):
    name: str
    total_quantity: float
    unit: str
    category: str
    allergen_warning: bool = False


class HouseholdSettingsIn(BaseModel):
    num_adults: int = Field(2, ge=0, le=40)
    num_children: int = Field(0, ge=0, le=40)
    num_toddlers: int = Field(0, ge=0, le=40)

    @model_validator(mode='after')
    def check_total(self):
        if self.num_adults + self.num_children + self.num_toddlers > 40:
            raise ValueError('Total household members cannot exceed 40')
        return self


class HouseholdSettingsOut(BaseModel):
    num_adults: int
    num_children: int
    num_toddlers: int

    class Config:
        from_attributes = True


class DayGuestsIn(BaseModel):
    adult_guests: int = Field(0, ge=0, le=40)
    child_guests: int = Field(0, ge=0, le=40)

    @model_validator(mode='after')
    def check_total(self):
        if self.adult_guests + self.child_guests > 40:
            raise ValueError('Total guests cannot exceed 40')
        return self


class DayGuestsOut(BaseModel):
    date: date
    adult_guests: int
    child_guests: int

    class Config:
        from_attributes = True


class FamilyGroupMemberOut(BaseModel):
    user_id: int
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_head: bool = False
    status: str = 'approved'
    food_preferences: List[str] = []

    class Config:
        from_attributes = True


class FamilyGroupOut(BaseModel):
    id: int
    name: str
    join_code: str
    owner_id: int
    members: List[FamilyGroupMemberOut] = []
    planner_id: Optional[int] = None
    planner_claimed_at: Optional[datetime] = None
    planner_last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True


class FamilyGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class FamilyGroupJoin(BaseModel):
    join_code: str = Field(min_length=1, max_length=16)


class ProfileOut(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    calorie_goal: Optional[int] = None
    protein_goal_g: Optional[int] = None
    carbs_goal_g: Optional[int] = None
    fats_goal_g: Optional[int] = None
    dietary_notes: Optional[str] = None
    age: Optional[int] = None
    weight_lbs: Optional[float] = None
    timezone: Optional[str] = None
    is_guest: bool = False

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    calorie_goal: Optional[int] = Field(None, ge=0, le=20000)
    protein_goal_g: Optional[int] = Field(None, ge=0, le=1000)
    carbs_goal_g: Optional[int] = Field(None, ge=0, le=2000)
    fats_goal_g: Optional[int] = Field(None, ge=0, le=1000)
    dietary_notes: Optional[str] = Field(None, max_length=500)
    age: Optional[int] = Field(None, ge=0, le=150)
    weight_lbs: Optional[float] = Field(None, ge=0, le=2000)
    timezone: Optional[str] = Field(None, max_length=64)


class FamilyMemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    allergies: List[str] = Field(default=[], max_length=50)
    foods_to_avoid: List[str] = Field(default=[], max_length=50)
    food_preferences: List[str] = Field(default=[], max_length=50)
    weight_lbs: Optional[float] = Field(None, ge=0, le=2000)


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    allergies: Optional[List[str]] = Field(None, max_length=50)
    foods_to_avoid: Optional[List[str]] = Field(None, max_length=50)
    food_preferences: Optional[List[str]] = Field(None, max_length=50)
    weight_lbs: Optional[float] = Field(None, ge=0, le=2000)


class FamilyMemberOut(BaseModel):
    id: int
    name: str
    allergies: List[str] = []
    foods_to_avoid: List[str] = []
    food_preferences: List[str] = []
    weight_lbs: Optional[float] = None

    class Config:
        from_attributes = True


class RequesterOut(BaseModel):
    id: int
    username: str
    first_name: Optional[str] = None

    class Config:
        from_attributes = True


class MealRequestCreate(BaseModel):
    week_start: date
    day_of_week: int = Field(ge=0, le=6)
    meal_slot: _MEAL_SLOTS
    meal_id: int = Field(gt=0)


class MealRequestOut(BaseModel):
    id: int
    week_start: date
    day_of_week: int
    meal_slot: str
    meal: MealOut
    status: str
    created_at: datetime
    requester: Optional[RequesterOut] = None

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    body: Optional[str] = None
    is_read: bool
    created_at: datetime
    data: Optional[dict] = None

    class Config:
        from_attributes = True


class FamilyNotifyRequest(BaseModel):
    week_start: date
    scope: str  # 'week' | 'day'
    day_of_week: Optional[int] = None


class WeightEntryCreate(BaseModel):
    weight_lbs: float = Field(gt=0, le=2000)
    logged_at: Optional[datetime] = None


class WeightEntryUpdate(BaseModel):
    weight_lbs: Optional[float] = Field(None, gt=0, le=2000)
    logged_at: Optional[datetime] = None


class WeightEntryOut(BaseModel):
    id: int
    weight_lbs: float
    logged_at: datetime

    class Config:
        from_attributes = True


_STORAGE_METHODS = Literal["frozen", "refrigerated", "pantry", "freeze_dried", "other"]


class VaultAddedByOut(BaseModel):
    id: int
    username: str
    first_name: Optional[str] = None

    class Config:
        from_attributes = True


class VaultEntryOut(BaseModel):
    id: int
    meal: MealOut
    storage_method: str
    servings_total: int
    servings_remaining: int
    date_added: date
    expiration_date: date
    expiry_notified: bool
    added_by: VaultAddedByOut
    status: str

    class Config:
        from_attributes = True


class VaultEntryCreate(BaseModel):
    meal_id: int = Field(gt=0)
    storage_method: _STORAGE_METHODS
    servings_total: int = Field(gt=0, le=100)
    date_added: date
    expiration_date: date


class VaultWithdrawRequest(BaseModel):
    servings: int = Field(gt=0, le=100)
