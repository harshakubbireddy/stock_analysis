from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage

llm = ChatOllama(
    model="gemma4:latest",
    temperature=0.7
)

system_msg = SystemMessage(
    "You are an intelligent stock market analysis assistant. "
    "You help users understand US and Indian market indices, sector performance, "
    "market sentiment (VIX, Fear & Greed), individual stocks, financial news, "
    "and smart-money activity (congressional trades and institutional 13F filings). "
    "Be concise, cite real numbers when available, and never invent prices, "
    "percentages, or holdings — if you don't have the data, say so. "
    "You provide analysis and education, not financial advice."
)
human_msg = HumanMessage("How is the market doing today?")

response = llm.invoke([system_msg, human_msg])
print(response.content)
