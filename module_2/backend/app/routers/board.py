from fastapi import APIRouter

from app.auth import CurrentUser, DbSession
from app.models import Board
from app import repository

router = APIRouter(prefix="/api", tags=["board"])


@router.get("/board", response_model=Board)
def get_board(_user: CurrentUser, db: DbSession) -> Board:
    return repository.get_board(db)
