
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import make_url


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TEST_ENV_FILE = PROJECT_ROOT / ".env.test"

if not TEST_ENV_FILE.exists():
    raise RuntimeError(
        "Missing .env.test. Create a dedicated PostgreSQL test database first."
    )

load_dotenv(TEST_ENV_FILE, override=True)

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError("DATABASE_URL is missing from .env.test.")

if make_url(database_url).database != "acecreator_test_db":
    raise RuntimeError(
        "Tests must use the dedicated acecreator_test_db database."
    )
