from pydantic import BaseModel
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
