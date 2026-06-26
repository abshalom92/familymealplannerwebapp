from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict
from datetime import date
from ..database import get_db
from .. import models
from ..auth_utils import get_current_user, get_group_user_ids

router = APIRouter()

BADGE_DEFS = [
    # Family — planning
    {"name": "First Week",          "description": "Planned your first meal as a family.",                     "category": "family",     "trigger_type": "planning_any",          "icon": "🗓️"},
    {"name": "Full Week",           "description": "Filled all 21 meal slots for a single week.",              "category": "family",     "trigger_type": "planning_full_week",     "icon": "✅"},
    {"name": "On a Roll",           "description": "Fully planned 2 consecutive weeks.",                       "category": "family",     "trigger_type": "planning_streak_2",      "icon": "🔥"},
    {"name": "Month of Meals",      "description": "Fully planned 4 consecutive weeks.",                       "category": "family",     "trigger_type": "planning_streak_4",      "icon": "📅"},
    {"name": "Quarter Strong",      "description": "Fully planned 12 consecutive weeks.",                      "category": "family",     "trigger_type": "planning_streak_12",     "icon": "💪"},
    {"name": "Half-Year Heroes",    "description": "Fully planned 26 consecutive weeks.",                      "category": "family",     "trigger_type": "planning_streak_26",     "icon": "🏆"},
    {"name": "Year-Round Family",   "description": "Fully planned 52 consecutive weeks.",                      "category": "family",     "trigger_type": "planning_streak_52",     "icon": "🌟"},
    # Family — variety
    {"name": "No Repeats",          "description": "A week with no meal appearing more than once.",            "category": "family",     "trigger_type": "variety_no_repeats",     "icon": "🎨"},
    {"name": "Breakfast Champions", "description": "Breakfast planned every day for a full week.",             "category": "family",     "trigger_type": "variety_breakfast_week", "icon": "🍳"},
    {"name": "Variety Pack",        "description": "Four consecutive weeks with no repeated meal.",            "category": "family",     "trigger_type": "variety_pack_4",         "icon": "🌈"},
    # Family — vault
    {"name": "First Prep",          "description": "Added your first item to the Meal Vault.",                "category": "family",     "trigger_type": "vault_first",            "icon": "🏪"},
    {"name": "Stocked Up",          "description": "5 or more active vault entries at the same time.",        "category": "family",     "trigger_type": "vault_stocked",          "icon": "📦"},
    {"name": "Zero Waste",          "description": "No vault entries have expired with servings remaining.",   "category": "family",     "trigger_type": "vault_zero_waste",       "icon": "♻️"},
    {"name": "Prep Masters",        "description": "20 or more total servings withdrawn from the vault.",      "category": "family",     "trigger_type": "vault_withdrawals_20",   "icon": "🥘"},
    # Individual
    {"name": "Meal Planner",        "description": "Added 10 meals to the family calendar.",                  "category": "individual", "trigger_type": "user_meals_10",          "icon": "📝"},
    {"name": "Super Planner",       "description": "Added 50 meals to the family calendar.",                  "category": "individual", "trigger_type": "user_meals_50",          "icon": "⭐"},
    {"name": "Vault Keeper",        "description": "Added 5 entries to the Meal Vault.",                      "category": "individual", "trigger_type": "user_vault_5",           "icon": "🔑"},
    {"name": "Vault Guardian",      "description": "Added 20 entries to the Meal Vault.",                     "category": "individual", "trigger_type": "user_vault_20",          "icon": "🛡️"},
]


def seed_badges(db: Session):
    for bd in BADGE_DEFS:
        if not db.query(models.Badge).filter_by(name=bd["name"]).first():
            db.add(models.Badge(**bd))
    db.commit()


# ── helpers ──────────────────────────────────────────────────────────────────

_MAIN_SLOTS = {"breakfast", "lunch", "dinner"}


def _get_full_week_dates(db: Session, user_ids: list[int]) -> list[date]:
    """Sorted list of week_starts where all 21 main-slot combos are filled."""
    rows = (
        db.query(models.MealPlan.week_start, models.MealPlan.day_of_week, models.MealPlan.meal_slot)
        .filter(models.MealPlan.user_id.in_(user_ids), models.MealPlan.meal_slot.in_(_MAIN_SLOTS))
        .distinct()
        .all()
    )
    by_week: dict[date, set] = defaultdict(set)
    for ws, dow, slot in rows:
        by_week[ws].add((dow, slot))
    return sorted(ws for ws, combos in by_week.items() if len(combos) >= 21)


def _max_streak(dates: list[date]) -> int:
    """Longest run of ISO-week-consecutive dates (7 days apart) in a sorted list."""
    if not dates:
        return 0
    best = cur = 1
    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]).days == 7:
            cur += 1
            best = max(best, cur)
        else:
            cur = 1
    return best


def _current_streak(dates: list[date]) -> int:
    """Length of the trailing run of consecutive weeks ending at the most recent entry."""
    if not dates:
        return 0
    cur = 1
    for i in range(len(dates) - 1, 0, -1):
        if (dates[i] - dates[i - 1]).days == 7:
            cur += 1
        else:
            break
    return cur


# ── evaluation ───────────────────────────────────────────────────────────────

def _eval_family(db: Session, group_id: int, user_ids: list[int]) -> dict[str, bool]:
    r: dict[str, bool] = {}

    # Planning
    r["planning_any"] = db.query(models.MealPlan).filter(models.MealPlan.user_id.in_(user_ids)).first() is not None
    full_weeks = _get_full_week_dates(db, user_ids)
    r["planning_full_week"] = len(full_weeks) >= 1
    streak = _max_streak(full_weeks)
    r["planning_streak_2"]  = streak >= 2
    r["planning_streak_4"]  = streak >= 4
    r["planning_streak_12"] = streak >= 12
    r["planning_streak_26"] = streak >= 26
    r["planning_streak_52"] = streak >= 52

    # Variety
    rows = (
        db.query(models.MealPlan.week_start, models.MealPlan.meal_id, models.MealPlan.meal_slot)
        .filter(models.MealPlan.user_id.in_(user_ids), models.MealPlan.meal_slot.in_(_MAIN_SLOTS))
        .all()
    )
    by_week_meals: dict[date, list] = defaultdict(list)
    by_week_bfast: dict[date, set]  = defaultdict(set)
    for ws, mid, slot in rows:
        by_week_meals[ws].append(mid)
        if slot == "breakfast":
            by_week_bfast[ws].add(mid)

    no_repeat_dates = sorted(
        ws for ws, mids in by_week_meals.items() if len(mids) == len(set(mids))
    )
    r["variety_no_repeats"]     = len(no_repeat_dates) >= 1
    r["variety_breakfast_week"] = any(len(v) >= 7 for v in by_week_bfast.values())
    r["variety_pack_4"]         = _max_streak(no_repeat_dates) >= 4

    # Vault
    vault = db.query(models.VaultEntry).filter(models.VaultEntry.family_group_id == group_id).all()
    r["vault_first"]          = len(vault) >= 1
    r["vault_stocked"]        = sum(1 for e in vault if e.servings_remaining > 0) >= 5
    today = date.today()
    has_waste = any(e.expiration_date < today and e.servings_remaining > 0 for e in vault)
    r["vault_zero_waste"]     = len(vault) > 0 and not has_waste
    r["vault_withdrawals_20"] = sum(e.servings_total - e.servings_remaining for e in vault) >= 20

    return r


def _eval_individual(db: Session, user_id: int) -> dict[str, bool]:
    meals = db.query(func.count(models.MealPlan.id)).filter(models.MealPlan.user_id == user_id).scalar() or 0
    vault = db.query(func.count(models.VaultEntry.id)).filter(models.VaultEntry.added_by_user_id == user_id).scalar() or 0
    return {
        "user_meals_10": meals >= 10,
        "user_meals_50": meals >= 50,
        "user_vault_5":  vault >= 5,
        "user_vault_20": vault >= 20,
    }


def _award_family(db: Session, group_id: int, earned: dict[str, bool], user_ids: list[int]):
    already = {
        fb.badge.trigger_type
        for fb in db.query(models.FamilyBadge).join(models.Badge)
            .filter(models.FamilyBadge.family_group_id == group_id).all()
    }
    new_any = False
    for trigger, qualified in earned.items():
        if not qualified or trigger in already:
            continue
        badge = db.query(models.Badge).filter_by(trigger_type=trigger, category="family").first()
        if not badge:
            continue
        db.add(models.FamilyBadge(family_group_id=group_id, badge_id=badge.id))
        for uid in user_ids:
            db.add(models.Notification(
                user_id=uid,
                type="badge_earned",
                title=f"Badge earned: {badge.icon} {badge.name}",
                body=badge.description,
                data={"badge_name": badge.name, "badge_icon": badge.icon},
            ))
        new_any = True
    if new_any:
        db.commit()


def _award_individual(db: Session, user_id: int, earned: dict[str, bool]):
    already = {
        ub.badge.trigger_type
        for ub in db.query(models.UserBadge).join(models.Badge)
            .filter(models.UserBadge.user_id == user_id).all()
    }
    new_any = False
    for trigger, qualified in earned.items():
        if not qualified or trigger in already:
            continue
        badge = db.query(models.Badge).filter_by(trigger_type=trigger, category="individual").first()
        if not badge:
            continue
        db.add(models.UserBadge(user_id=user_id, badge_id=badge.id))
        db.add(models.Notification(
            user_id=user_id,
            type="badge_earned",
            title=f"Badge earned: {badge.icon} {badge.name}",
            body=badge.description,
            data={"badge_name": badge.name, "badge_icon": badge.icon},
        ))
        new_any = True
    if new_any:
        db.commit()


# ── route ────────────────────────────────────────────────────────────────────

@router.get("")
def get_badges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = current_user.family_group_membership
    in_group = bool(membership and membership.status == "approved")
    group_id = membership.group_id if in_group else None
    user_ids = get_group_user_ids(db, current_user)

    # Evaluate & award new badges
    family_earned: dict[str, bool] = {}
    if in_group:
        family_earned = _eval_family(db, group_id, user_ids)
        _award_family(db, group_id, family_earned, user_ids)

    ind_earned = _eval_individual(db, current_user.id)
    _award_individual(db, current_user.id, ind_earned)

    # Fetch all earned badges for response
    family_badges = []
    if in_group:
        family_badges = (
            db.query(models.FamilyBadge).join(models.Badge)
            .filter(models.FamilyBadge.family_group_id == group_id)
            .order_by(models.FamilyBadge.earned_at.desc())
            .all()
        )

    personal_badges = (
        db.query(models.UserBadge).join(models.Badge)
        .filter(models.UserBadge.user_id == current_user.id)
        .order_by(models.UserBadge.earned_at.desc())
        .all()
    )

    # Build numeric progress for "next badge" recommendation
    full_weeks = _get_full_week_dates(db, user_ids) if in_group else []
    cur_streak = _current_streak(full_weeks)

    vault_entries = (
        db.query(models.VaultEntry).filter(models.VaultEntry.family_group_id == group_id).all()
        if in_group else []
    )
    active_vault   = sum(1 for e in vault_entries if e.servings_remaining > 0)
    total_withdrawn = sum(e.servings_total - e.servings_remaining for e in vault_entries)
    vault_count_total = len(vault_entries)

    meals_added = db.query(func.count(models.MealPlan.id)).filter(models.MealPlan.user_id == current_user.id).scalar() or 0
    vault_added = db.query(func.count(models.VaultEntry.id)).filter(models.VaultEntry.added_by_user_id == current_user.id).scalar() or 0

    numeric: dict[str, tuple[int, int]] = {
        "planning_streak_2":  (cur_streak, 2),
        "planning_streak_4":  (cur_streak, 4),
        "planning_streak_12": (cur_streak, 12),
        "planning_streak_26": (cur_streak, 26),
        "planning_streak_52": (cur_streak, 52),
        "vault_stocked":        (active_vault, 5),
        "vault_withdrawals_20": (total_withdrawn, 20),
        "vault_first":          (min(vault_count_total, 1), 1),
        "user_meals_10": (meals_added, 10),
        "user_meals_50": (meals_added, 50),
        "user_vault_5":  (vault_added, 5),
        "user_vault_20": (vault_added, 20),
    }

    earned_triggers = {fb.badge.trigger_type for fb in family_badges} | {ub.badge.trigger_type for ub in personal_badges}

    best_next = None
    best_pct = -1.0
    for trigger, (current, target) in numeric.items():
        if trigger in earned_triggers:
            continue
        badge = db.query(models.Badge).filter_by(trigger_type=trigger).first()
        if not badge:
            continue
        if badge.category == "family" and not in_group:
            continue
        pct = min(current / target * 100, 99.9)
        if pct > best_pct:
            best_pct = pct
            best_next = {"badge": badge, "current": current, "target": target, "pct": round(pct, 1)}

    def _fmt_badge(b, earned_at):
        return {
            "id": b.id, "name": b.name, "description": b.description,
            "category": b.category, "icon": b.icon,
            "earned_at": earned_at.isoformat(),
        }

    return {
        "in_group": in_group,
        "family_badges":   [_fmt_badge(fb.badge, fb.earned_at) for fb in family_badges],
        "personal_badges": [_fmt_badge(ub.badge, ub.earned_at) for ub in personal_badges],
        "next_badge": {
            "id": best_next["badge"].id,
            "name": best_next["badge"].name,
            "description": best_next["badge"].description,
            "category": best_next["badge"].category,
            "icon": best_next["badge"].icon,
            "current": best_next["current"],
            "target": best_next["target"],
            "pct": best_next["pct"],
        } if best_next else None,
    }
