"""Centralized error handling placeholder for ingest, embeddings and retrieval."""

from dataclasses import dataclass, asdict
from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# ---- Base errors for RAG ----------------------------------------------------


class RagError(Exception):
    """Base class for controlled RAG errors."""

    error_code: str = "RAG_ERROR"
    http_status: int = 500

    def __init__(self, message: str, *, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(RagError):
    error_code = "VALIDATION_ERROR"
    http_status = 400


class RetrievalError(RagError):
    error_code = "RETRIEVAL_ERROR"
    http_status = 502


class LlmError(RagError):
    error_code = "LLM_ERROR"
    http_status = 502


class RateLimitError(RagError):
    error_code = "RATE_LIMITED"
    http_status = 429


class InternalRagError(RagError):
    error_code = "INTERNAL_ERROR"
    http_status = 500


# ---- Payload & normalization -----------------------------------------------


@dataclass
class ErrorPayload:
    error: bool
    type: str
    code: str
    message: str
    request_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        # filter out None values
        return {k: v for k, v in asdict(self).items() if v is not None}


def _build_payload_from_rag_error(
    exc: RagError,
    *,
    request_id: Optional[str] = None,
) -> ErrorPayload:
    return ErrorPayload(
        error=True,
        type=exc.__class__.__name__,
        code=exc.error_code,
        message=exc.message,
        request_id=request_id,
        details=exc.details or {},
    )


def _build_payload_from_unexpected_error(
    exc: Exception,
    *,
    request_id: Optional[str] = None,
) -> ErrorPayload:
    # Keep message generic for clients; details should be logged elsewhere
    return ErrorPayload(
        error=True,
        type="UnexpectedError",
        code="INTERNAL_ERROR",
        message="Ett internt fel uppstod. Försök igen senare.",
        request_id=request_id,
        details=None,
    )


# ---- FastAPI integration ----------------------------------------------------


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register global exception handlers for the RAG/API.

    Usage:
        app = FastAPI(...)
        register_exception_handlers(app)
    """

    @app.exception_handler(RagError)
    async def rag_error_handler(request: Request, exc: RagError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        payload = _build_payload_from_rag_error(exc, request_id=request_id)
        status = getattr(exc, "http_status", 500)
        return JSONResponse(status_code=status, content=payload.to_dict())

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        # Everything not a RagError ends up here
        request_id = getattr(request.state, "request_id", None)
        payload = _build_payload_from_unexpected_error(exc, request_id=request_id)
        return JSONResponse(status_code=500, content=payload.to_dict())

