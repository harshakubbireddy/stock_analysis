from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.api.congress import router as congress_router
from app.api.market import router as market_router
from app.api.thirteenf import router as thirteenf_router
from app.core.cache import clear_all
from app.core.config import settings

app = FastAPI(
    title="Stock Analysis API",
    description="Stock market data API",
    version="0.1.0",
)

app.include_router(ai_router)
app.include_router(congress_router)
app.include_router(market_router)
app.include_router(thirteenf_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Stock Analysis API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/cache/clear")
async def clear_cache():
    cleared = clear_all()
    return {"status": "cleared", "rows_removed": cleared}
