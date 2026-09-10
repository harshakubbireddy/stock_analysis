"""Single LLM instance + system prompt, shared by the CLI script and the API."""
import os
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage

load_dotenv()

# Pick local Ollama or the GLM API based on USE_LOCAL_LLM
if os.getenv("USE_LOCAL_LLM") == "true":
    llm = ChatOllama(
        model=os.getenv("OLLAMA_MODEL_GEMMA_LARGE"),
        temperature=0.7,
    )
else:
    llm = ChatOpenAI(
        model=os.getenv("GLM_MODEL_LARGE"),
        openai_api_key=os.getenv("GLM_API_KEY"),
        openai_api_base="https://api.z.ai/api/paas/v4/",
        temperature=0.7,
    )

SYSTEM_PROMPT = SystemMessage(
    "You are an intelligent stock market analysis assistant for a generative UI app — "
    "your responses may be rendered as rich components (cards, tables, lists) in the chat. "
    "You help users understand US and Indian market indices and stock performance. "
    "Be concise, cite real numbers when available, and never invent prices, "
    "percentages, or holdings — if you don't have the data, say so. "
    "You provide analysis and education, not financial advice."
)
