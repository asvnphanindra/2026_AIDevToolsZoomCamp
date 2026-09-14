from fastapi import APIRouter

from app.auth import CurrentUser
from app.models import Board
from app.store import store

router = APIRouter(prefix="/api", tags=["board"])


@router.get("/board", response_model=Board)
def get_board(_user: CurrentUser) -> Board:
    return store.get_board()
