from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth as auth_router
from app.routers import board, cards, projects, settings

app = FastAPI(
    title="Mini Kanban API",
    version="0.1.0",
    description="Backend for the Mini Kanban personal planner.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(board.router)
app.include_router(projects.router)
app.include_router(cards.router)
app.include_router(settings.router)
