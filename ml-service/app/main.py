from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from .config import settings
from .model_service import ModelService
from .schemas import ModelInfo, PredictionRequest, PredictionResponse

model_service = ModelService(settings.model_path)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.model_path.exists():
        model_service.load()
    yield


app = FastAPI(
    title="IsoGuard Isolation Forest Service",
    version=settings.model_version,
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "healthy" if model_service.ready else "degraded",
        "modelLoaded": model_service.ready,
    }


@app.get("/model/info", response_model=ModelInfo)
def model_info() -> ModelInfo:
    return ModelInfo(**model_service.info())


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    if not model_service.ready:
        raise HTTPException(status_code=503, detail="Model is not loaded.")
    return model_service.predict(request)
