import os

class Settings:
    PROJECT_NAME: str = "Wishlist Centralizer"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_key_for_dev_only_wishlist_app_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite+aiosqlite:///./wishlist.db"
    )

settings = Settings()
