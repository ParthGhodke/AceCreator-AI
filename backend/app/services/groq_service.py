import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError(
        "GROQ_API_KEY is missing from the project-root .env file."
    )

client = Groq(api_key=api_key)


def test_groq_connection() -> str:
    """Test Groq and report why the response might lack text."""
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "user",
                "content": "Reply with exactly: AceCreator AI connection successful",
            }
        ],
        temperature=0,
        max_tokens=100,
    )

    choice = response.choices[0]

    print("Response finish reason:", choice.finish_reason)
    print("Response message:", choice.message)

    result = choice.message.content

    if not result:
        raise RuntimeError(
            "Groq returned no text. Check the finish reason and message above."
        )

    return result.strip()   