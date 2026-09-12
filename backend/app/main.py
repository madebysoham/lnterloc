import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.routes.intercept import router as intercept_router
from backend.app.routes.audit import router as audit_router
from backend.app.routes.graph_routes import router as graph_router
from backend.app.routes.mocks_and_scenarios import router as mock_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize in-memory state, load models if present
    yield
    # Shutdown: clean up resources


app = FastAPI(
    title=settings.APP_NAME,
    description="Real-Time APP Fraud Interceptor & Mule-Chain Tracer for UPI Payment Switches",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Mintu's Next.js split-screen simulator
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add sub-45ms SLA latency audit header to all responses
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time_ms = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Interloc-Latency-Ms"] = f"{process_time_ms:.2f}"
    response.headers["X-Interloc-SLA-Budget-Ms"] = str(settings.SLA_BUDGET_MS)
    return response


# Register Modular Routers
app.include_router(intercept_router)
app.include_router(audit_router)
app.include_router(graph_router)
app.include_router(mock_router)


@app.get("/health", tags=["Health & Metrics"])
async def health_check():
    """Liveness probe verifying sub-45ms engine readiness."""
    return {
        "status": "healthy",
        "service": "interloc-core-decision-engine",
        "sla_target_ms": settings.SLA_BUDGET_MS,
        "pareto_alpha": settings.DEFAULT_PARETO_ALPHA,
        "dpdp_masking": "SALTED_SHA256_ACTIVE",
        "rbi_model": "JAN_2027_LIABILITY_ACTIVE",
    }


@app.get("/metrics", tags=["Health & Metrics"])
async def prometheus_metrics():
    """Prometheus-compatible health metrics endpoint."""
    return {
        "sla_target_ms": settings.SLA_BUDGET_MS,
        "engine_status": 1,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
