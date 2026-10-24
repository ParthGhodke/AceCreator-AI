import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

raw_database_url = os.getenv("DATABASE_URL", "").strip()

if not raw_database_url:
    raise RuntimeError(
        "DATABASE_URL is not configured. "
        "Please add it to the .env file or cloud environment variables."
    )

# Cloud providers (Render, Neon, Supabase, Railway, Heroku) often supply
# 'postgres://' or 'postgresql://'. Normalize for SQLAlchemy 2.0 + psycopg2.
if raw_database_url.startswith("postgres://"):
    DATABASE_URL = raw_database_url.replace(
        "postgres://", "postgresql+psycopg2://", 1
    )
elif raw_database_url.startswith("postgresql://"):
    DATABASE_URL = raw_database_url.replace(
        "postgresql://", "postgresql+psycopg2://", 1
    )
else:
    DATABASE_URL = raw_database_url

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
