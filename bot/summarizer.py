import openai
from typing import List
import logging
from config import OPENAI_API_KEY

openai.api_key = OPENAI_API_KEY
logger = logging.getLogger(__name__)

async def generate_summary(messages: List[str]) -> str:
    """Generate a summary of messages using OpenAI's API"""
    try:
        # Combine messages into a single string
        combined_messages = "\n".join(messages)
        
        # Create the prompt for the API
        prompt = f"""Please summarize the following conversation in brief, clear bullet points. 
        Focus on the main topics and key points discussed:

        {combined_messages}
        """
        
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes conversations."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        raise
