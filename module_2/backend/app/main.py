from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db as db_module
from app.routers import auth as auth_router
from app.routers import board, cards, projects, settings
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db_module.init_db()
    with db_module.SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(
    title="Weekslot API",
    version="0.1.0",
    description="Backend for the Weekslot personal planner.",
    lifespan=lifespan,
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
