from __future__ import annotations

from dataclasses import dataclass

from langchain_core.language_models import BaseChatModel
from pydantic import SecretStr

from app.config import get_settings

settings = get_settings()

_TITLE_PROMPT = "Generate a short 3-5 word title (no quotes, no punctuation) for this question: {question}"


@dataclass
class LLMResult:
    answer: str
    input_tokens: int
    output_tokens: int

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


def _derive_provider(model: str) -> str:
    if model.startswith("gemini"):
        return "gemini"
    if model.startswith("claude"):
        return "anthropic"
    return "openai"


def _build_client(model: str) -> BaseChatModel:
    provider = _derive_provider(model)
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is not configured")
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=SecretStr(settings.google_api_key),
            temperature=0,
            max_retries=1,
            timeout=20,
        )
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        kwargs = {
            "model": model,
            "api_key": SecretStr(settings.anthropic_api_key),
            "temperature": 0,
            "max_retries": 1,
            "timeout": 20,
        }
        if settings.anthropic_base_url:
            kwargs["base_url"] = settings.anthropic_base_url
            # Proxies like gwai sit behind Cloudflare WAF and block default
            # Anthropic SDK telemetry headers (x-stainless-*). Override
            # User-Agent and disable stainless headers to mimic plain curl.
            kwargs["default_headers"] = {
                "User-Agent": "curl/8.0",
                "x-stainless-arch": "",
                "x-stainless-lang": "",
                "x-stainless-os": "",
                "x-stainless-package-version": "",
                "x-stainless-runtime": "",
                "x-stainless-runtime-version": "",
                "x-stainless-async": "",
                "x-stainless-helper-method": "",
                "x-stainless-retry-count": "",
                "x-stainless-timeout": "",
            }
        return ChatAnthropic(**kwargs)
    from langchain_openai import ChatOpenAI
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured")
    return ChatOpenAI(
        model=model,
        api_key=SecretStr(settings.openai_api_key),
        temperature=0,
        max_retries=1,
        timeout=20,
    )


def _extract_usage(response) -> tuple[int, int]:
    """Extract (input_tokens, output_tokens) from any LangChain response."""
    meta = getattr(response, "usage_metadata", None)
    if meta:
        # LangChain standard: input_tokens / output_tokens
        inp = getattr(meta, "input_tokens", None) or meta.get("input_tokens", 0) if hasattr(meta, "get") else getattr(meta, "input_tokens", 0)
        out = getattr(meta, "output_tokens", None) or meta.get("output_tokens", 0) if hasattr(meta, "get") else getattr(meta, "output_tokens", 0)
        return int(inp), int(out)
    # fallback: response_metadata (older LangChain versions)
    rm = getattr(response, "response_metadata", {}) or {}
    # OpenAI format
    usage = rm.get("token_usage") or rm.get("usage", {})
    if usage:
        return int(usage.get("prompt_tokens", 0)), int(usage.get("completion_tokens", 0))
    return 0, 0


class LLMClient:
    def __init__(self, model: str | None = None) -> None:
        self._model = model or settings.llm_model_name
        self._client: BaseChatModel | None = None

    def _get_client(self) -> BaseChatModel:
        if self._client is None:
            self._client = _build_client(self._model)
        return self._client

    def generate_answer(self, question: str, contexts: list[dict]) -> LLMResult:
        if not contexts:
            return LLMResult(
                answer="I could not find relevant indexed context for this question yet.",
                input_tokens=0,
                output_tokens=0,
            )

        context_block = "\n\n".join(
            f"[Source {i + 1}] {item['filename']} | chunk={item['chunk_index']}\n{item['snippet']}"
            for i, item in enumerate(contexts)
        )
        prompt = (
            "You are a research assistant. Answer only from the provided context. "
            "If the context is insufficient, say that the available documents do not provide enough information.\n\n"
            f"Context:\n{context_block}\n\n"
            f"Question: {question}\n\n"
            "Answer in a concise paragraph."
        )
        response = self._get_client().invoke(prompt)
        answer = response.content if isinstance(response.content, str) else str(response.content)
        input_tokens, output_tokens = _extract_usage(response)
        return LLMResult(answer=answer, input_tokens=input_tokens, output_tokens=output_tokens)

    def generate_title(self, question: str) -> str:
        prompt = _TITLE_PROMPT.format(question=question[:200])
        try:
            response = self._get_client().invoke(prompt)
            title = response.content if isinstance(response.content, str) else str(response.content)
            return title.strip()[:80]
        except Exception:
            return question[:60]
