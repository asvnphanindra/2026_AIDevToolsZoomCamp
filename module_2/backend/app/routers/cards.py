from fastapi import APIRouter, HTTPException, Response, status

from app.auth import CurrentUser
from app.models import Card, CardCreate, CardUpdate, MapCardRequest
from app.store import store

router = APIRouter(prefix="/api/cards", tags=["cards"])


@router.post("", response_model=Card, status_code=status.HTTP_201_CREATED)
def create_card(body: CardCreate, _user: CurrentUser) -> Card:
    card = store.create_card(body.projectId, body.title)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return card


@router.patch("/{id}", response_model=Card)
def update_card(id: str, body: CardUpdate, _user: CurrentUser) -> Card:
    if body.title is None and body.status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of title or status is required",
        )
    card = store.update_card(id, title=body.title, status=body.status)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return card


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(id: str, _user: CurrentUser) -> Response:
    if not store.delete_card(id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{id}/slot", response_model=Card)
def map_card(id: str, body: MapCardRequest, _user: CurrentUser) -> Card:
    card = store.map_card(id, body.slot)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return card
