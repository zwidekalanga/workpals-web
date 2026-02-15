# OpenRouter API Research Notes

> **Date:** 2026-02-11
> **Purpose:** Evaluate OpenRouter as a unified API gateway for Gemini models (chat, function calling, structured output, embeddings)
> **Sources:** OpenRouter official docs, model pages, PyPI, GitHub SDK repo

---

## 1. Model IDs and Capabilities

### Chat / Completion Models

| Model | OpenRouter ID | Context Window | Input $/M | Output $/M | Notes |
|-------|--------------|----------------|-----------|------------|-------|
| **Gemini 2.5 Pro** | `google/gemini-2.5-pro` | 1,048,576 | $1.25 | $10.00 | Flagship reasoning model. Mandatory thinking. Top of LMArena leaderboard. |
| **Gemini 2.5 Flash** | `google/gemini-2.5-flash` | 1,048,576 | $0.30 | $2.50 | "Workhorse" model. Configurable reasoning depth. Best price/performance. |
| **Gemini 2.5 Flash Lite** | `google/gemini-2.5-flash-lite` | 1,048,576 | $0.10 | $0.40 | Ultra-low latency/cost. Thinking disabled by default (enable via reasoning param). |

All three models support:
- **Input modalities:** text, image, file, audio, video
- **Output modality:** text
- **Max completion tokens:** 65,535-65,536
- **Function calling / tool use**
- **Structured outputs / JSON mode**
- **Streaming**
- **Seed parameter** (reproducibility)
- **Temperature, top_p, stop sequences**

### Embedding Models

| Model | OpenRouter ID | Context Window | Input $/M | Dimensions |
|-------|--------------|----------------|-----------|------------|
| **text-embedding-3-small** | `openai/text-embedding-3-small` | 8,192 | $0.02 | 1,536 (default) |
| **text-embedding-3-large** | `openai/text-embedding-3-large` | 8,192 | $0.13 | 3,072 (default) |

OpenRouter provides a dedicated embeddings endpoint. The `openai/text-embedding-3-small` model is fully available and heavily used (12B+ input tokens/day as of Feb 2026).

---

## 2. API Fundamentals

### Base URL and Authentication

```
Base URL: https://openrouter.ai/api/v1
Auth:     Authorization: Bearer <OPENROUTER_API_KEY>
```

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/chat/completions` | Chat completions (OpenAI-compatible) |
| POST | `/embeddings` | Generate embeddings |
| GET | `/embeddings/models` | List available embedding models |
| GET | `/models` | List all available models |
| GET | `/key` | Check rate limits and credit balance |

### Optional Headers

```
HTTP-Referer: https://yourapp.com    (for OpenRouter leaderboards)
X-Title: YourAppName                 (for OpenRouter leaderboards)
```

---

## 3. Function Calling / Tool Use

OpenRouter uses the **OpenAI-compatible format** for tool calling. The `tools` parameter follows the exact same schema as OpenAI's API. For non-OpenAI providers (like Gemini), OpenRouter transforms the request automatically.

### Step 1: Send Request with Tool Definitions

```python
import httpx

OPENROUTER_API_KEY = "sk-or-..."
BASE_URL = "https://openrouter.ai/api/v1"

response = httpx.post(
    f"{BASE_URL}/chat/completions",
    headers={
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "model": "google/gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": "What's the weather in Cape Town?"}
        ],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Get current weather for a given location",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "City name, e.g. 'Cape Town, ZA'"
                            },
                            "unit": {
                                "type": "string",
                                "enum": ["celsius", "fahrenheit"],
                                "description": "Temperature unit"
                            }
                        },
                        "required": ["location"]
                    }
                }
            }
        ],
        "tool_choice": "auto"  # "auto" | "none" | "required" | {"type": "function", "function": {"name": "get_weather"}}
    },
)

data = response.json()
# data["choices"][0]["message"]["tool_calls"] contains the function call(s)
```

### Step 2: Parse Tool Call from Response

```python
message = data["choices"][0]["message"]
# message looks like:
# {
#   "role": "assistant",
#   "content": null,
#   "tool_calls": [
#     {
#       "id": "call_abc123",
#       "type": "function",
#       "function": {
#         "name": "get_weather",
#         "arguments": "{\"location\": \"Cape Town, ZA\", \"unit\": \"celsius\"}"
#       }
#     }
#   ]
# }
```

### Step 3: Send Tool Results Back

```python
import json

# Execute the tool locally
weather_result = {"temperature": 24, "condition": "Sunny", "unit": "celsius"}

# Send the result back to the model
follow_up = httpx.post(
    f"{BASE_URL}/chat/completions",
    headers={
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "model": "google/gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": "What's the weather in Cape Town?"},
            message,  # The assistant's tool_calls message
            {
                "role": "tool",
                "tool_call_id": "call_abc123",
                "content": json.dumps(weather_result)
            }
        ],
        "tools": [  # IMPORTANT: tools must be included in every request
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Get current weather for a given location",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {"type": "string", "description": "City name"},
                            "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
                        },
                        "required": ["location"]
                    }
                }
            }
        ]
    },
)

final_answer = follow_up.json()["choices"][0]["message"]["content"]
# "The current weather in Cape Town is 24 degrees Celsius and sunny."
```

### Tool Choice Options

| Value | Behavior |
|-------|----------|
| `"auto"` (default) | Model decides whether to use tools |
| `"none"` | Disables tool usage entirely |
| `"required"` | Model must call one or more tools |
| `{"type": "function", "function": {"name": "..."}}` | Force a specific tool |

### Parallel Tool Calls

```python
"parallel_tool_calls": True   # default: True — model can request multiple tools at once
"parallel_tool_calls": False  # tools requested sequentially
```

### Key Notes

- The `tools` parameter **must be included in every request** in the conversation for validation.
- The format is 100% OpenAI-compatible. OpenRouter transforms it for Gemini automatically.
- Filter models that support tools: `https://openrouter.ai/models?supported_parameters=tools`
- **Interleaved thinking** is available: model can reason between tool calls (increases token usage).

---

## 4. Structured Output / JSON Mode

OpenRouter supports two modes via the `response_format` parameter:

### Mode 1: Basic JSON Mode

Forces the model to return valid JSON (no schema enforcement):

```python
response = httpx.post(
    f"{BASE_URL}/chat/completions",
    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
    json={
        "model": "google/gemini-2.5-flash",
        "messages": [
            {"role": "user", "content": "List 3 South African cities with their provinces. Return as JSON."}
        ],
        "response_format": {
            "type": "json_object"
        }
    },
)
```

### Mode 2: Strict JSON Schema Mode (Recommended)

Forces the model to return JSON matching an exact schema:

```python
response = httpx.post(
    f"{BASE_URL}/chat/completions",
    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
    json={
        "model": "google/gemini-2.5-flash",
        "messages": [
            {
                "role": "system",
                "content": "You are a structured data extraction assistant."
            },
            {
                "role": "user",
                "content": "Extract employee info: John Smith is a senior engineer at WorkPals, hired 2024-03-15, earning R850,000/year."
            }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "employee_info",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "full_name": {"type": "string", "description": "Employee full name"},
                        "job_title": {"type": "string", "description": "Job title"},
                        "company": {"type": "string", "description": "Company name"},
                        "hire_date": {"type": "string", "description": "ISO 8601 date"},
                        "annual_salary": {
                            "type": "object",
                            "properties": {
                                "amount": {"type": "number"},
                                "currency": {"type": "string"}
                            },
                            "required": ["amount", "currency"]
                        }
                    },
                    "required": ["full_name", "job_title", "company", "hire_date", "annual_salary"]
                }
            }
        }
    },
)

import json
employee = json.loads(response.json()["choices"][0]["message"]["content"])
# {
#   "full_name": "John Smith",
#   "job_title": "Senior Engineer",
#   "company": "WorkPals",
#   "hire_date": "2024-03-15",
#   "annual_salary": {"amount": 850000, "currency": "ZAR"}
# }
```

### Structured Output Notes

- Works with **streaming** (`stream: true`) -- streams partial valid JSON.
- Gemini models are listed as supported for structured outputs.
- OpenRouter offers a **response healing plugin** to fix imperfect JSON from models.
- Include property `description` fields in schemas for better results.
- Always set `"strict": true` in production.

---

## 5. Embeddings API

### Endpoint

```
POST https://openrouter.ai/api/v1/embeddings
```

### Request Format

```python
response = httpx.post(
    f"{BASE_URL}/embeddings",
    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
    json={
        "model": "openai/text-embedding-3-small",
        "input": "WorkPals helps South African businesses manage payroll and HR."
    },
)

data = response.json()
embedding = data["data"][0]["embedding"]  # List of 1536 floats
```

### Batch Embeddings

```python
response = httpx.post(
    f"{BASE_URL}/embeddings",
    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
    json={
        "model": "openai/text-embedding-3-small",
        "input": [
            "First document text",
            "Second document text",
            "Third document text"
        ]
    },
)

data = response.json()
embeddings = [item["embedding"] for item in data["data"]]
# List of 3 embedding vectors
```

### List Available Embedding Models

```
GET https://openrouter.ai/api/v1/embeddings/models
```

---

## 6. Python Client Options

### Option A: OpenAI SDK with Custom Base URL (Recommended for Most Use Cases)

The most battle-tested approach. Full compatibility with the OpenAI ecosystem (LangChain, LlamaIndex, Instructor, etc.).

```bash
pip install openai
```

```python
from openai import OpenAI
import os

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
    default_headers={
        "HTTP-Referer": "https://workpals.co.za",  # optional
        "X-Title": "WorkPals",                       # optional
    },
)

# --- Chat completion ---
completion = client.chat.completions.create(
    model="google/gemini-2.5-flash",
    messages=[
        {"role": "system", "content": "You are a helpful HR assistant."},
        {"role": "user", "content": "What are the BCEA requirements for overtime pay in South Africa?"},
    ],
    max_tokens=2048,
    temperature=0.3,
)
print(completion.choices[0].message.content)

# --- Streaming ---
stream = client.chat.completions.create(
    model="google/gemini-2.5-flash",
    messages=[{"role": "user", "content": "Explain UIF contributions."}],
    stream=True,
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)

# --- Embeddings ---
embedding_response = client.embeddings.create(
    model="openai/text-embedding-3-small",
    input="Employee leave policy document",
)
vector = embedding_response.data[0].embedding  # List[float], len=1536

# --- Structured output ---
completion = client.chat.completions.create(
    model="google/gemini-2.5-flash",
    messages=[{"role": "user", "content": "Extract: Jane Doe, Software Dev, started 2025-01-10"}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "employee",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "role": {"type": "string"},
                    "start_date": {"type": "string"},
                },
                "required": ["name", "role", "start_date"],
            },
        },
    },
)

# --- Tool calling ---
completion = client.chat.completions.create(
    model="google/gemini-2.5-flash",
    messages=[{"role": "user", "content": "Look up employee #1234"}],
    tools=[
        {
            "type": "function",
            "function": {
                "name": "get_employee",
                "description": "Retrieve employee record by ID",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "employee_id": {"type": "string", "description": "The employee ID"}
                    },
                    "required": ["employee_id"],
                },
            },
        }
    ],
)

# --- OpenRouter-specific features via extra_body ---
completion = client.chat.completions.create(
    model="google/gemini-2.5-flash",
    messages=[{"role": "user", "content": "Hello"}],
    extra_body={
        "provider": {
            "order": ["Google AI Studio", "Google Vertex"],
            "sort": "price",
        },
        "models": [  # fallback models
            "google/gemini-2.5-flash",
            "google/gemini-2.5-flash-lite",
        ],
    },
)
```

### Option B: Official OpenRouter Python SDK (Beta)

Newer, OpenRouter-native SDK. Type-safe with async support. Still in beta (v0.6.0 as of Feb 2026).

```bash
pip install openrouter
```

```python
from openrouter import OpenRouter
import os

# Synchronous
with OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY", "")) as client:
    res = client.chat.send(
        messages=[{"role": "user", "content": "Hello, how are you?"}],
        model="google/gemini-2.5-flash",
    )

# Asynchronous with streaming
import asyncio

async def main():
    async with OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY", "")) as client:
        res = await client.chat.send_async(
            messages=[{"role": "user", "content": "Hello"}],
            model="google/gemini-2.5-flash",
            stream=True,
        )
        async for event in res:
            print(event, flush=True)

asyncio.run(main())
```

### Option C: Raw httpx (Maximum Control)

Best for custom retry logic, middleware, or when you want zero abstraction.

```python
import httpx
import os

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
BASE_URL = "https://openrouter.ai/api/v1"
HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://workpals.co.za",
    "X-Title": "WorkPals",
}

async def chat(messages: list[dict], model: str = "google/gemini-2.5-flash", **kwargs) -> dict:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{BASE_URL}/chat/completions",
            headers=HEADERS,
            json={"model": model, "messages": messages, **kwargs},
        )
        response.raise_for_status()
        return response.json()
```

### Recommendation

**Use the OpenAI SDK** (`pip install openai`) for production. Reasons:
1. Most ecosystem tools (LangChain, Instructor, LlamaIndex) integrate with the OpenAI client.
2. Well-documented, stable API surface.
3. Full support for streaming, tool calling, structured output, embeddings.
4. OpenRouter's API is explicitly designed for OpenAI SDK compatibility.
5. Easy to switch between OpenAI direct and OpenRouter by changing `base_url`.

The official `openrouter` SDK is worth watching but is beta and may have breaking changes.

---

## 7. Pricing Summary

| Model | Input $/M tokens | Output $/M tokens | Audio $/M tokens |
|-------|------------------|--------------------|-------------------|
| `google/gemini-2.5-pro` | **$1.25** | **$10.00** | $1.25 |
| `google/gemini-2.5-flash` | **$0.30** | **$2.50** | $1.00 |
| `google/gemini-2.5-flash-lite` | **$0.10** | **$0.40** | $0.30 |
| `openai/text-embedding-3-small` | **$0.02** | N/A | N/A |

**Key pricing notes:**
- OpenRouter does **not** mark up provider pricing. You pay the same as going direct.
- The value proposition is unified API, automatic failover, and access to 300+ models.
- Flash Lite at $0.10/$0.40 is extremely competitive for high-volume, latency-sensitive work.
- Flash at $0.30/$2.50 is the sweet spot for most production workloads.

### Cost Comparison (per 1M input + 1M output tokens)

| Model | Total Cost | Relative |
|-------|-----------|----------|
| Gemini 2.5 Pro | $11.25 | 1x (baseline) |
| Gemini 2.5 Flash | $2.80 | 4x cheaper |
| Gemini 2.5 Flash Lite | $0.50 | 22.5x cheaper |

---

## 8. Rate Limits and Error Handling

### Rate Limit Tiers

| Account Status | Free Model Limit |
|---------------|-----------------|
| < 10 credits purchased | 50 requests/day on free models |
| >= 10 credits purchased | 1,000 requests/day on free models |
| Paid models | Per-model limits vary; Cloudflare DDoS protection applies |

### Rate Limit Headers

Rate limit info is returned in response headers:
- `X-RateLimit-Limit` -- max requests allowed
- `X-RateLimit-Remaining` -- requests remaining
- `X-RateLimit-Reset` -- when the limit resets

### Check Limits Programmatically

```python
response = httpx.get(
    "https://openrouter.ai/api/v1/key",
    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
)
key_info = response.json()
# {
#   "limit": 100.0,           # credit ceiling (null if unlimited)
#   "limit_remaining": 87.5,  # available credits
#   "usage": 12.5,            # total credits consumed
#   "usage_daily": 3.2,
#   "usage_weekly": 12.5,
#   "usage_monthly": 12.5,
#   "is_free_tier": false
# }
```

### HTTP Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| **400** | Bad request (invalid params, CORS) | Fix request parameters |
| **401** | Invalid API key or expired OAuth | Check/refresh credentials |
| **402** | Insufficient credits | Add credits, notify user |
| **403** | Content flagged by moderation | Review input content |
| **408** | Request timed out | Retry with backoff |
| **429** | Rate limited | Retry with exponential backoff |
| **502** | Provider down or invalid response | Auto-retried by OpenRouter routing; or retry manually |
| **503** | No provider available for routing requirements | Relax provider constraints or try later |

### Error Response Format

```json
{
  "error": {
    "code": 429,
    "message": "Rate limit exceeded. Please slow down.",
    "metadata": {
      "headers": {
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": "1707700000"
      }
    }
  }
}
```

### Streaming Errors

- **Pre-stream errors:** Standard JSON error response with HTTP status code.
- **Mid-stream errors:** Sent as SSE event with `finish_reason: "error"` and error details in the event data.

### Recommended Retry Strategy

```python
import httpx
import asyncio
import random

async def call_openrouter_with_retry(
    payload: dict,
    max_retries: int = 3,
    base_delay: float = 1.0,
) -> dict:
    """Call OpenRouter API with exponential backoff retry."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(max_retries + 1):
            try:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

                if response.status_code == 429:
                    if attempt == max_retries:
                        response.raise_for_status()
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    await asyncio.sleep(delay)
                    continue

                if response.status_code == 402:
                    raise ValueError("Insufficient OpenRouter credits. Top up at https://openrouter.ai/credits")

                if response.status_code in (502, 503):
                    if attempt == max_retries:
                        response.raise_for_status()
                    delay = base_delay * (2 ** attempt)
                    await asyncio.sleep(delay)
                    continue

                response.raise_for_status()
                return response.json()

            except httpx.TimeoutException:
                if attempt == max_retries:
                    raise
                await asyncio.sleep(base_delay * (2 ** attempt))

    raise RuntimeError("Max retries exceeded")
```

### Provider Fallback (Built-in)

OpenRouter automatically retries with alternative providers on 5xx errors. You can also configure explicit fallback:

```python
# Fallback chain: try Flash first, fall back to Flash Lite
completion = client.chat.completions.create(
    model="google/gemini-2.5-flash",
    messages=[{"role": "user", "content": "Hello"}],
    extra_body={
        "models": [
            "google/gemini-2.5-flash",
            "google/gemini-2.5-flash-lite",
        ],
        "route": "fallback",
    },
)
```

---

## 9. Debugging

Enable debug mode (streaming only) to inspect the transformed request:

```python
completion = client.chat.completions.create(
    model="google/gemini-2.5-flash",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True,
    extra_body={
        "debug": {"echo_upstream_body": True}
    },
)
# First chunk contains the transformed request body sent to the provider
```

**Warning:** Never use debug mode in production -- it may expose sensitive request data.

---

## 10. Quick Reference: Minimal Working Example

```python
"""Minimal OpenRouter + Gemini example."""
from openai import OpenAI
import os

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

# Chat
response = client.chat.completions.create(
    model="google/gemini-2.5-flash",
    messages=[{"role": "user", "content": "Say hello in Zulu."}],
)
print(response.choices[0].message.content)

# Embedding
emb = client.embeddings.create(
    model="openai/text-embedding-3-small",
    input="Sawubona",
)
print(f"Embedding dimension: {len(emb.data[0].embedding)}")
```

---

## Sources

- [Gemini 2.5 Pro on OpenRouter](https://openrouter.ai/google/gemini-2.5-pro)
- [Gemini 2.5 Flash on OpenRouter](https://openrouter.ai/google/gemini-2.5-flash)
- [Gemini 2.5 Flash Lite on OpenRouter](https://openrouter.ai/google/gemini-2.5-flash-lite)
- [text-embedding-3-small on OpenRouter](https://openrouter.ai/openai/text-embedding-3-small)
- [Tool & Function Calling Docs](https://openrouter.ai/docs/guides/features/tool-calling)
- [Structured Outputs Docs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [API Reference](https://openrouter.ai/docs/api/reference/overview)
- [API Parameters](https://openrouter.ai/docs/api/reference/parameters)
- [Error Handling Docs](https://openrouter.ai/docs/api/reference/errors-and-debugging)
- [Rate Limits Docs](https://openrouter.ai/docs/api/reference/limits)
- [Embeddings API Docs](https://openrouter.ai/docs/api/reference/embeddings)
- [OpenAI SDK Integration](https://openrouter.ai/docs/guides/community/openai-sdk)
- [OpenRouter Python SDK (PyPI)](https://pypi.org/project/openrouter/)
- [OpenRouter Python SDK (GitHub)](https://github.com/OpenRouterTeam/python-sdk)
- [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart)
