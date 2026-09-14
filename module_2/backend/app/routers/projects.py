from fastapi import APIRouter, HTTPException, Response, status

from app.auth import CurrentUser
from app.models import Project, ProjectCreate, ProjectRename
from app.store import store

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, _user: CurrentUser) -> Project:
    return store.create_project(body.name)


@router.patch("/{id}", response_model=Project)
def rename_project(id: str, body: ProjectRename, _user: CurrentUser) -> Project:
    project = store.rename_project(id, body.name)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(id: str, _user: CurrentUser) -> Response:
    if not store.delete_project(id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
