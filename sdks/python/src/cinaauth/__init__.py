"""
cinaauth Python SDK

Official Python client library for the cinaauth REST API.
Provides type-safe access to authentication, user management,
MFA, OAuth 2.0, and administrative features.
"""

from .client import CinaauthClient
from .exceptions import *
from .models import *

__version__ = "1.0.0"
__author__ = "cinaauth Team"
__email__ = "support@cinaauth.dev"

__all__ = [
    "CinaauthClient",
    # Exceptions
    "CinaauthError",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "ConflictError",
    "RateLimitError",
    "ServerError",
    "NetworkError",
    "TimeoutError",
    # Models
    "UserInfo",
    "UserProfile",
    "LoginResponse",
    "TokenResponse",
    "MFASetupResponse",
    "SystemStats",
    "HealthStatus",
    "DetailedHealthStatus",
]
