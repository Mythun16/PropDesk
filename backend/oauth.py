import os
import requests as http_requests


def verify_google_token(token: str) -> dict:
    """Verify a Google ID token via Google's tokeninfo endpoint."""
    resp = http_requests.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": token},
        timeout=10,
    )
    if resp.status_code != 200:
        raise ValueError(f"Google rejected token: {resp.text}")

    payload = resp.json()

    expected_aud = os.getenv("GOOGLE_CLIENT_ID")
    if expected_aud and payload.get("aud") != expected_aud:
        raise ValueError(
            f"Token audience mismatch: got {payload.get('aud')!r}, "
            f"expected {expected_aud!r}"
        )

    return payload
