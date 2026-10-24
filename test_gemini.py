from backend.app.services.groq_service import test_groq_connection


if __name__ == "__main__":
    print("Starting Groq connection test...")
    try:
        print("Sending request to Groq...")
        result = test_groq_connection()
        print("Groq connection successful!")
        print("Response:", result)
    except Exception as error:
        print("Groq connection failed.")
        print("Error type:", type(error).__name__)
        print("Error details:", str(error))
