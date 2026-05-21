# Family Meal Planner

A responsive full-stack web app for planning weekly family meals, tracking nutrition, generating grocery lists, and managing family profiles.

## Features

- **Login / Guest Access** — create an account or jump straight in as a guest
- **Dashboard** — weekly nutrition overview with macro pie chart, food group bar chart, and per-nutrient summaries with goal progress bars
- **Weekly Meal Calendar** — assign breakfast, lunch, and dinner to any day of the week
- **Auto-Fill** — randomly populate empty slots for one or all meal types in a single click
- **Clear Week** — wipe the week's plan with a confirmation step
- **Recipe Modal** — click any meal to see ingredients and step-by-step instructions
- **Auto Grocery List** — aggregates all ingredients from the week's meals, grouped by category, with a checkoff interface and household-scaled quantities
- **Family Members** — add family member profiles with allergies, foods to avoid, and preferences; meals are filtered accordingly when planning
- **Group Size Scaling** — set household size (adults, children, toddlers) and add per-day guests; grocery quantities scale automatically
- **Nutrition Tracking** — 40 pre-seeded meals with calories, protein, carbs, fats, iron, calcium, vitamin C, and vitamin D
- **User Profile** — set your first name, last name, and daily macro goals; the Dashboard adapts with your name and goal progress bars

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL + SQLAlchemy |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Auth | JWT (python-jose) |

## Project Structure

```
Meal_Prep_planner/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, startup seed
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── auth_utils.py    # JWT + password hashing
│   │   ├── seed_data.py     # 40 pre-loaded meals with nutrition data
│   │   └── routers/
│   │       ├── auth.py      # register, login, guest
│   │       ├── meals.py     # list & get meals (supports member filtering)
│   │       ├── calendar.py  # weekly plan CRUD + autofill + clear
│   │       ├── grocery.py   # aggregated grocery list with quantity scaling
│   │       ├── family.py    # family member CRUD
│   │       ├── household.py # household size settings + per-day guests
│   │       └── profile.py   # user profile GET/PUT
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/           # DashboardPage, CalendarPage, GroceryPage,
│       │                    # RecipePage, FamilyPage, ProfilePage, LoginPage
│       ├── components/      # Navbar, RecipeModal, MealPickerModal,
│       │                    # AutoFillModal, DayGuestsPopover
│       ├── context/         # AuthContext (JWT state)
│       └── api/             # Axios client
├── start.sh                 # One-command startup script
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (running locally)

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/abshalom92/familymealplannerwebapp.git
cd familymealplannerwebapp
```

### 2. Create the database

```bash
psql -c "CREATE DATABASE mealplanner;"
```

### 3. Set up the backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

The default database URL is `postgresql:///mealplanner` (connects as the current OS user with no password). To override, create `backend/.env`:

```
DATABASE_URL=postgresql://user:password@localhost/mealplanner
SECRET_KEY=your_secret_key_here
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Start the app

```bash
./start.sh
```

Then open **http://localhost:5173** in your browser.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/guest` | Guest session |
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update name & dietary goals |
| GET | `/api/meals/` | List all meals (optional `?member_id=`) |
| GET | `/api/meals/{id}` | Get meal + recipe |
| GET | `/api/calendar/week?week_start=` | Get week's meal plan |
| POST | `/api/calendar/` | Add meal to a slot |
| POST | `/api/calendar/autofill` | Auto-fill week |
| DELETE | `/api/calendar/week?week_start=` | Clear week |
| DELETE | `/api/calendar/{id}` | Remove single slot |
| GET | `/api/grocery/week?week_start=` | Get grocery list (household-scaled) |
| GET | `/api/family/` | List family members |
| POST | `/api/family/` | Add family member |
| PUT | `/api/family/{id}` | Update family member |
| DELETE | `/api/family/{id}` | Delete family member |
| GET | `/api/household/settings` | Get household size |
| PUT | `/api/household/settings` | Update household size |
| GET | `/api/household/guests/{date}` | Get guests for a day |
| PUT | `/api/household/guests/{date}` | Set guests for a day |
