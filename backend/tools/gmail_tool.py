"""Gmail Tool - Send and read emails via Gmail API."""
import base64
from email.mime.text import MIMEText
from typing import Optional

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


class GmailTool:
    """Wraps Gmail API for sending and listing emails."""

    SCOPES = [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
    ]

    def __init__(self, token: Optional[str] = None):
        self.service = None
        if token:
            creds = Credentials(token=token)
            self.service = build("gmail", "v1", credentials=creds)

    def _ensure_service(self):
        if not self.service:
            raise RuntimeError("Gmail not authenticated. Connect your Google account first.")

    def send_email(self, to: str, subject: str, body: str) -> dict:
        """Send an email through Gmail."""
        self._ensure_service()

        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        sent = self.service.users().messages().send(
            userId="me", body={"raw": raw}
        ).execute()

        return {
            "status": "sent",
            "message_id": sent.get("id", ""),
            "to": to,
            "subject": subject,
        }

    def list_emails(self, query: str = "", max_results: int = 5) -> list:
        """List recent emails matching an optional query."""
        self._ensure_service()

        results = self.service.users().messages().list(
            userId="me", q=query, maxResults=max_results
        ).execute()

        messages = results.get("messages", [])
        emails = []

        for msg_ref in messages:
            msg = self.service.users().messages().get(
                userId="me", id=msg_ref["id"], format="metadata",
                metadataHeaders=["Subject", "From", "Date"],
            ).execute()

            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            emails.append({
                "id": msg["id"],
                "subject": headers.get("Subject", "(no subject)"),
                "from": headers.get("From", "unknown"),
                "date": headers.get("Date", ""),
                "snippet": msg.get("snippet", ""),
            })

        return emails
