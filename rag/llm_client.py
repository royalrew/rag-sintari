from __future__ import annotations

from typing import Dict, Any, List, Optional

from openai import OpenAI

from rag.config_loader import load_config, get_openai_api_key


class LLMClient:
    def __init__(self) -> None:
        cfg = load_config()
        models_cfg = cfg.get("models", {})
        llm_cfg = models_cfg.get("llm", {})

        self.model_answer: str = llm_cfg.get("answer", "gpt-4o")
        self.model_answer_premium: str = llm_cfg.get("answer_premium", "gpt-4.1")
        self.model_summary: str = llm_cfg.get("summary", "gpt-4o-mini")
        self.model_extract: str = llm_cfg.get("extract", "gpt-4o-mini")
        self.model_fallback: str = llm_cfg.get("fallback", "gpt-4o")

        self._client = OpenAI(api_key=get_openai_api_key())

    def _chat(self, model: str, system_prompt: str, user_prompt: str) -> str:
        resp = self._client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
        )
        return resp.choices[0].message.content or ""

    def answer(self, user_prompt: str, system_prompt: str) -> str:
        return self._chat(self.model_answer, system_prompt, user_prompt)

    def answer_premium(self, user_prompt: str, system_prompt: str) -> str:
        return self._chat(self.model_answer_premium, system_prompt, user_prompt)

    def summarize(self, user_prompt: str, system_prompt: str) -> str:
        return self._chat(self.model_summary, system_prompt, user_prompt)

    def extract(self, user_prompt: str, system_prompt: str) -> str:
        return self._chat(self.model_extract, system_prompt, user_prompt)


