"""Content catalog for Project Meridian — 14 titles, 7 genres x 2 titles."""
from __future__ import annotations

CATALOG = [
    {"content_id": "C001", "title": "Midnight River", "genre": "Drama", "duration_min": 118, "release_year": 2024},
    {"content_id": "C002", "title": "The Last Cartographer", "genre": "Sci-Fi", "duration_min": 126, "release_year": 2025},
    {"content_id": "C003", "title": "Paper Moons", "genre": "Romance", "duration_min": 104, "release_year": 2023},
    {"content_id": "C004", "title": "City of Echoes", "genre": "Thriller", "duration_min": 112, "release_year": 2025},
    {"content_id": "C005", "title": "Laugh Track", "genre": "Comedy", "duration_min": 48, "release_year": 2024},
    {"content_id": "C006", "title": "The Salt Route", "genre": "Documentary", "duration_min": 86, "release_year": 2022},
    {"content_id": "C007", "title": "Orbital Decay", "genre": "Sci-Fi", "duration_min": 121, "release_year": 2026},
    {"content_id": "C008", "title": "Monsoon Diaries", "genre": "Drama", "duration_min": 109, "release_year": 2023},
    {"content_id": "C009", "title": "The Glass Alibi", "genre": "Thriller", "duration_min": 98, "release_year": 2024},
    {"content_id": "C010", "title": "Terra Unknown", "genre": "Documentary", "duration_min": 92, "release_year": 2025},
    {"content_id": "C011", "title": "Hearts in Transit", "genre": "Romance", "duration_min": 101, "release_year": 2024},
    {"content_id": "C012", "title": "Strike Force: Reckoning", "genre": "Action", "duration_min": 115, "release_year": 2026},
    {"content_id": "C013", "title": "The Startup Siblings", "genre": "Comedy", "duration_min": 52, "release_year": 2025},
    {"content_id": "C014", "title": "Night Patrol", "genre": "Action", "duration_min": 107, "release_year": 2023},
]

USER_IDS = [f"U{i:03d}" for i in range(1, 34)]  # U001..U033 — exactly 33 users
SUPPORTED_EVENTS = ["play", "pause", "seek", "buffer", "stop"]
