"""Multi-factor authentication service for AuthFramework.

Copyright (c) 2025 AuthFramework. All rights reserved.
"""

from __future__ import annotations

from typing import Any

from ._base import BaseClient, RequestConfig


class MFAService:
    """Service for multi-factor authentication operations."""

    def __init__(self, client: BaseClient) -> None:
        """Initialize MFA service.

        Args:
            client: The base HTTP client

        """
        self._client = client

    async def enable_totp(self) -> dict[str, Any]:
        """Enable TOTP authentication.

        Returns:
            TOTP setup data including QR code.

        """
        return await self._client.make_request("POST", "/mfa/totp/enable")

    async def verify_totp_setup(self, code: str) -> dict[str, Any]:
        """Verify TOTP setup with code.

        Args:
            code: TOTP verification code

        Returns:
            Verification response with backup codes.

        """
        data = {"code": code}
        config = RequestConfig(json_data=data)
        return await self._client.make_request(
            "POST", "/mfa/totp/verify", config=config
        )

    async def disable_totp(self, password: str) -> dict[str, Any]:
        """Disable TOTP authentication.

        Args:
            password: User's password for confirmation

        Returns:
            Disable confirmation.

        """
        data = {"password": password}
        config = RequestConfig(json_data=data)
        return await self._client.make_request(
            "POST", "/mfa/totp/disable", config=config
        )

    async def verify_totp(self, code: str) -> dict[str, Any]:
        """Verify TOTP code during login.

        Args:
            code: TOTP code

        Returns:
            Verification response.

        """
        data = {"code": code}
        config = RequestConfig(json_data=data)
        return await self._client.make_request(
            "POST", "/mfa/totp/verify-login", config=config
        )

    async def enable_sms(self, phone_number: str) -> dict[str, Any]:
        """Enable SMS authentication.

        Args:
            phone_number: Phone number for SMS

        Returns:
            SMS setup confirmation.

        """
        data = {"phone_number": phone_number}
        config = RequestConfig(json_data=data)
        return await self._client.make_request("POST", "/mfa/sms/enable", config=config)

    async def verify_sms_setup(self, code: str) -> dict[str, Any]:
        """Verify SMS setup with code.

        Args:
            code: SMS verification code

        Returns:
            Verification response.

        """
        data = {"code": code}
        config = RequestConfig(json_data=data)
        return await self._client.make_request("POST", "/mfa/sms/verify", config=config)

    async def disable_sms(self, password: str) -> dict[str, Any]:
        """Disable SMS authentication.

        Args:
            password: User's password for confirmation

        Returns:
            Disable confirmation.

        """
        data = {"password": password}
        config = RequestConfig(json_data=data)
        return await self._client.make_request(
            "POST", "/mfa/sms/disable", config=config
        )

    async def send_sms(self) -> dict[str, Any]:
        """Send SMS code during login.

        Returns:
            SMS send confirmation.

        """
        return await self._client.make_request("POST", "/mfa/sms/send")

    async def verify_sms(self, code: str) -> dict[str, Any]:
        """Verify SMS code during login.

        Args:
            code: SMS code

        Returns:
            Verification response.

        """
        data = {"code": code}
        config = RequestConfig(json_data=data)
        return await self._client.make_request(
            "POST", "/mfa/sms/verify-login", config=config
        )

    async def enable_email(self) -> dict[str, Any]:
        """Enable email authentication.

        Returns:
            Email setup confirmation.

        """
        return await self._client.make_request("POST", "/mfa/email/enable")

    async def disable_email(self, password: str) -> dict[str, Any]:
        """Disable email authentication.

        Args:
            password: User's password for confirmation

        Returns:
            Disable confirmation.

        """
        data = {"password": password}
        config = RequestConfig(json_data=data)
        return await self._client.make_request(
            "POST", "/mfa/email/disable", config=config
        )

    async def send_email(self) -> dict[str, Any]:
        """Send email code during login.

        Returns:
            Email send confirmation.

        """
        return await self._client.make_request("POST", "/mfa/email/send")

    async def verify_email_mfa(self, code: str) -> dict[str, Any]:
        """Verify email code during MFA login.

        Args:
            code: Email code

        Returns:
            Verification response.

        """
        data = {"code": code}
        config = RequestConfig(json_data=data)
        return await self._client.make_request(
            "POST", "/mfa/email/verify-login", config=config
        )

    async def get_backup_codes(self) -> dict[str, Any]:
        """Fail fast because the current REST API does not expose backup-code retrieval.

        Returns:
            This method always raises because existing backup codes are not retrievable.

        """
        raise NotImplementedError(
            "The current AuthFramework REST API does not expose a GET /mfa/backup-codes "
            "endpoint. Use regenerate_backup_codes() to issue a fresh set of backup codes."
        )

    async def regenerate_backup_codes(
        self, password: str | None = None
    ) -> dict[str, Any]:
        """Regenerate MFA backup codes.

        Args:
            password: Retained for backward compatibility. The current REST endpoint ignores it.

        Returns:
            New backup codes.

        """
        del password
        return await self._client.make_request(
            "POST", "/mfa/regenerate-backup-codes"
        )

    async def verify_backup_code(self, code: str) -> dict[str, Any]:
        """Verify a one-time backup code for the authenticated user.

        Args:
            code: Backup code

        Returns:
            Verification response.

        """
        data = {"backup_code": code}
        config = RequestConfig(json_data=data)
        return await self._client.make_request(
            "POST", "/mfa/verify-backup-code", config=config
        )
