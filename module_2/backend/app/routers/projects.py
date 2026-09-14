from fastapi import APIRouter, HTTPException, Response, status

from app.auth import CurrentUser, DbSession
from app.models import Project, ProjectCreate, ProjectRename
from app import repository

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, _user: CurrentUser, db: DbSession) -> Project:
    return repository.create_project(db, body.name)


@router.patch("/{id}", response_model=Project)
def rename_project(
    id: str, body: ProjectRename, _user: CurrentUser, db: DbSession
) -> Project:
    project = repository.rename_project(db, id, body.name)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(id: str, _user: CurrentUser, db: DbSession) -> Response:
    if not repository.delete_project(db, id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
