"""
LoanGuard Safe URL Extraction Service (Python)
Extracts body text from public advertisement webpages with comprehensive SSRF guardrails.
"""

import ipaddress
from urllib.parse import urlparse
from typing import Tuple, Optional
from config import Config

def validate_url(url: str) -> Tuple[bool, Optional[str]]:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, "Only HTTP and HTTPS URLs are supported."

        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL host."

        if hostname.lower() in ("localhost", "127.0.0.1", "::1") or hostname.lower().endswith(".localhost"):
            return False, "Access to localhost or loopback addresses is blocked."

        # Check IP address blocks (RFC 1918)
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                return False, "Access to private or local IP ranges is blocked."
        except ValueError:
            # Domain name, not a raw IP address
            pass

        return True, None
    except Exception as e:
        return False, f"Malformed URL: {str(e)}"

def fetch_url_content(url: str) -> Tuple[bool, str]:
    is_valid, err = validate_url(url)
    if not is_valid:
        return False, err or "Invalid URL"

    try:
        import requests
        from bs4 import BeautifulSoup

        response = requests.get(
            url,
            timeout=Config.URL_FETCH_TIMEOUT_SECONDS,
            headers={"User-Agent": "LoanGuard-Risk-Analyzer/1.0"},
            stream=True
        )

        # Size check
        content = b""
        for chunk in response.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > Config.URL_FETCH_MAX_BYTES:
                return False, "Webpage exceeds maximum allowed response size (500 KB)."

        soup = BeautifulSoup(content, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "noscript", "svg"]):
            tag.decompose()

        text = soup.get_text(separator=" ", strip=True)
        if not text:
            return False, "Webpage contained no legible text."

        return True, text[:3000]
    except Exception as e:
        return False, f"Failed to fetch webpage: {str(e)}"
