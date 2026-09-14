from fastapi import APIRouter

from app.auth import CurrentUser
from app.models import Board, SetMondayDateRequest
from app.store import store

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.put("/week", response_model=Board)
def set_monday_date(body: SetMondayDateRequest, _user: CurrentUser) -> Board:
    return store.set_monday_date(body.mondayDate)
