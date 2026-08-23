import json
import logging
from groq import Groq
from .config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LLM_SERVICE")

def get_groq_client():
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is not configured. Falling back to mockup / default summaries.")
        return None
    try:
        return Groq(api_key=settings.GROQ_API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")
        return None

def generate_pre_visit_summary(symptoms: str) -> dict:
    fallback = {
        "urgency_level": "Medium",
        "chief_complaint": symptoms[:100] + ("..." if len(symptoms) > 100 else ""),
        "suggested_questions": (
            "1. When did these symptoms first start, and have they worsened?\n"
            "2. Are there any other associated symptoms or trigger factors?\n"
            "3. Have you tried any medications or treatments, and did they help?"
        )
    }
    
    client = get_groq_client()
    if not client:
        return fallback

    prompt = (
        f"Analyse these symptoms and return a JSON object with the following keys:\n"
        f"- urgency_level (strictly choose one of: Low, Medium, High)\n"
        f"- chief_complaint (a brief summary of the primary complaint)\n"
        f"- suggested_questions (a string listing three suggested questions for the doctor, separated by newlines)\n\n"
        f"Symptoms: {symptoms}"
    )

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical assistant AI. You analyze symptoms and return clinical metadata in structured JSON format."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama3-8b-8192",  # Fast and reliable fallback or llama-3.3-70b-versatile
            response_format={"type": "json_object"},
            timeout=8.0  # Concurrency safety timeout
        )
        
        content = chat_completion.choices[0].message.content
        data = json.loads(content)
        
        # Verify keys
        required_keys = ["urgency_level", "chief_complaint", "suggested_questions"]
        if all(k in data for k in required_keys):
            return {
                "urgency_level": str(data["urgency_level"]),
                "chief_complaint": str(data["chief_complaint"]),
                "suggested_questions": str(data["suggested_questions"])
            }
        else:
            logger.error("Groq JSON response missing required keys")
            return fallback
            
    except Exception as e:
        logger.error(f"Groq API Call Failed or Timed Out: {e}")
        return fallback

def generate_patient_friendly_summary(notes: str) -> str:
    fallback = (
        "Here is a summary of your doctor's clinical notes:\n"
        f"{notes}\n\n"
        "Please follow the medication schedule and recommendations detailed by your doctor above."
    )
    
    client = get_groq_client()
    if not client:
        return fallback

    prompt = (
        "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps:\n"
        f"{notes}"
    )

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a compassionate healthcare AI assistant. Translate clinical notes into clear, patient-friendly language with actionable steps."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama3-8b-8192",
            timeout=8.0
        )
        
        summary = chat_completion.choices[0].message.content
        return summary.strip()
    except Exception as e:
        logger.error(f"Groq API Call Failed or Timed Out (Patient Summary): {e}")
        return fallback
