from fastapi import APIRouter

from app.auth import CurrentUser, DbSession
from app.models import Board, SetMondayDateRequest
from app import repository

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.put("/week", response_model=Board)
def set_monday_date(
    body: SetMondayDateRequest, _user: CurrentUser, db: DbSession
) -> Board:
    return repository.set_monday_date(db, body.mondayDate)
