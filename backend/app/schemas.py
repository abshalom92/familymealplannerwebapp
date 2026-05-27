from pydantic import BaseModel, Field, model_validator, field_validator
from typing import Optional, List
from datetime import date, datetime


class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str
    invite_code: str

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
    username: str
    password: str


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
    day_of_week: int
    meal_slot: str
    meal_id: int


class MealPlanOut(BaseModel):
    id: int
    week_start: date
    day_of_week: int
    meal_slot: str
    meal_id: int
    meal: MealOut
    planned_by: Optional[str] = None

    class Config:
        from_attributes = True


class AutofillRequest(BaseModel):
    week_start: date
    slots: List[str]  # e.g. ["breakfast", "lunch", "dinner"]
    overwrite: bool = False


class GroceryItem(BaseModel):
    name: str
    total_quantity: float
    unit: str
    category: str


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

    class Config:
        from_attributes = True


class FamilyGroupOut(BaseModel):
    id: int
    name: str
    join_code: str
    owner_id: int
    members: List[FamilyGroupMemberOut] = []

    class Config:
        from_attributes = True


class FamilyGroupCreate(BaseModel):
    name: str


class FamilyGroupJoin(BaseModel):
    join_code: str


class ProfileOut(BaseModel):
    username: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    calorie_goal: Optional[int] = None
    protein_goal_g: Optional[int] = None
    carbs_goal_g: Optional[int] = None
    fats_goal_g: Optional[int] = None
    dietary_notes: Optional[str] = None
    age: Optional[int] = None
    weight_lbs: Optional[float] = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    calorie_goal: Optional[int] = None
    protein_goal_g: Optional[int] = None
    carbs_goal_g: Optional[int] = None
    fats_goal_g: Optional[int] = None
    dietary_notes: Optional[str] = None
    age: Optional[int] = None
    weight_lbs: Optional[float] = None


class FamilyMemberCreate(BaseModel):
    name: str
    allergies: List[str] = []
    foods_to_avoid: List[str] = []
    food_preferences: List[str] = []
    weight_lbs: Optional[float] = None


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = None
    allergies: Optional[List[str]] = None
    foods_to_avoid: Optional[List[str]] = None
    food_preferences: Optional[List[str]] = None
    weight_lbs: Optional[float] = None


class FamilyMemberOut(BaseModel):
    id: int
    name: str
    allergies: List[str] = []
    foods_to_avoid: List[str] = []
    food_preferences: List[str] = []
    weight_lbs: Optional[float] = None

    class Config:
        from_attributes = True


class WeightEntryCreate(BaseModel):
    weight_lbs: float
    logged_at: Optional[datetime] = None


class WeightEntryUpdate(BaseModel):
    weight_lbs: Optional[float] = None
    logged_at: Optional[datetime] = None


class WeightEntryOut(BaseModel):
    id: int
    weight_lbs: float
    logged_at: datetime

    class Config:
        from_attributes = True
