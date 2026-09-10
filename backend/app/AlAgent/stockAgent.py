"""CLI test script — runs the graph with a test question."""
from langchain_core.messages import HumanMessage, AIMessage
from app.AlAgent.graph import graph

human_msg = HumanMessage("How is the market doing today?")
result = graph.invoke({"messages": [human_msg]})

# Print only AI messages (the responses)
for msg in result["messages"]:
    if isinstance(msg, AIMessage) and msg.content:
        print(msg.content)
