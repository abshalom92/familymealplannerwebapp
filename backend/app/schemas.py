from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import date


class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str


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


class FamilyMemberCreate(BaseModel):
    name: str
    allergies: List[str] = []
    foods_to_avoid: List[str] = []
    food_preferences: List[str] = []


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = None
    allergies: Optional[List[str]] = None
    foods_to_avoid: Optional[List[str]] = None
    food_preferences: Optional[List[str]] = None


class FamilyMemberOut(BaseModel):
    id: int
    name: str
    allergies: List[str] = []
    foods_to_avoid: List[str] = []
    food_preferences: List[str] = []

    class Config:
        from_attributes = True
