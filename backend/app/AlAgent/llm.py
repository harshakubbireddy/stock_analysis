"""Single LLM instance shared by the CLI script and the API.

Prompt templates live in `prompts.py`.
"""
import os
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

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
