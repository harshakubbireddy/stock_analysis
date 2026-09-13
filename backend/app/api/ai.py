"""AI chat endpoint — runs the LangGraph agent and streams responses via SSE.

Two event types:
  - Text:    data: {"type": "text", "content": "..."}\n\n
  - UI:      data: {"type": "component", "component": "stock_market_overview", "props": {...}}\n\n
  - End:     data: [DONE]\n\n
"""
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from app.AlAgent.graph import graph

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    message: str


def stream_response(message: str):
    """Run the graph and yield SSE events.

    - ToolMessage whose content is a dict with "component" → UI event
    - AIMessage with text content and no tool calls → text event
      (includes the agent's news summary after news_summary runs)
    """
    human_msg = HumanMessage(message)
    for output in graph.stream({"messages": [human_msg]}):
        for node_name, state_update in output.items():
            if not state_update:
                continue
            # News node: it fetched headlines → show them as a UI card
            if node_name == "news" and state_update.get("news_items"):
                event = {
                    "type": "component",
                    "component": "news_summary",
                    "props": {"items": state_update["news_items"]},
                }
                yield f"data: {json.dumps(event)}\n\n"
            for msg in state_update.get("messages", []):
                # Tool results: check if it's a UI component
                if isinstance(msg, ToolMessage):
                    try:
                        result = json.loads(msg.content)
                        if isinstance(result, dict) and "component" in result:
                            event = {"type": "component", **result}
                            yield f"data: {json.dumps(event)}\n\n"
                    except (json.JSONDecodeError, TypeError):
                        pass  # plain string tool result — goes back to the agent
                # AI text responses (not tool calls)
                elif isinstance(msg, AIMessage) and msg.content and not getattr(msg, "tool_calls", None):
                    event = {"type": "text", "content": msg.content}
                    yield f"data: {json.dumps(event)}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/chat")
async def chat(req: ChatRequest):
    return StreamingResponse(
        stream_response(req.message),
        media_type="text/event-stream",
    )
