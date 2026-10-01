"""
Shared LLM chat-client factory with AUTOMATIC PROVIDER FAILOVER.

Several services (question generation, answer evaluation, level detection,
coding-question generation) need a raw OpenAI-compatible chat client. They call
`client.chat.completions.create(...)`.

This module returns a *resilient* client that holds an ordered list of
providers (e.g. NVIDIA NIM first, Groq second). On every call it tries the
primary provider; if that raises for ANY reason (bad key, invalid model id,
network/egress, rate limit, unsupported `response_format`), it transparently
retries on the next provider. This means the interview keeps working as long as
*any one* configured provider is reachable — no code change needed in callers,
and no need to hand-diagnose which provider is down.
"""
import os
import logging

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class _ResilientCompletions:
    """Mimics `client.chat.completions` with cross-provider failover."""

    def __init__(self, providers):
        # providers: list of dicts {name, client, model}
        self._providers = providers

    def create(self, model=None, **kwargs):
        last_err = None
        for p in self._providers:
            pmodel = p["model"]
            try:
                return p["client"].chat.completions.create(model=pmodel, **kwargs)
            except Exception as e:
                last_err = e
                logger.error("LLM provider '%s' (model=%s) failed: %s", p["name"], pmodel, e)
                # Some models reject response_format=json_object — retry once without it.
                if "response_format" in kwargs:
                    kw = dict(kwargs)
                    kw.pop("response_format", None)
                    try:
                        logger.warning("Retrying '%s' without response_format…", p["name"])
                        return p["client"].chat.completions.create(model=pmodel, **kw)
                    except Exception as e2:
                        last_err = e2
                        logger.error("Provider '%s' retry (no response_format) failed: %s", p["name"], e2)
                # fall through to the next provider
        # All providers failed — surface the last error to the caller.
        raise last_err if last_err else RuntimeError("No LLM providers configured")


class _ResilientChat:
    def __init__(self, providers):
        self.completions = _ResilientCompletions(providers)


class ResilientChatClient:
    """Drop-in replacement exposing `.chat.completions.create(...)`."""

    def __init__(self, providers):
        if not providers:
            raise RuntimeError("ResilientChatClient needs at least one provider")
        self.chat = _ResilientChat(providers)
        self.providers = providers


def _make_groq(groq_key, llm_providers):
    from groq import Groq
    client = Groq(api_key=groq_key.strip("'\""), http_client=httpx.Client(verify=False))
    model = llm_providers.get("groq", {}).get("MODEL", "llama-3.3-70b-versatile")
    return {"name": "groq", "client": client, "model": model}


def _make_nvidia(llm_providers):
    from openai import OpenAI
    nvidia_cfg = llm_providers.get("nvidia", {})
    api_key = (nvidia_cfg.get("API_KEY")
               or getattr(settings, "NVIDIA_API_KEY", "")
               or os.environ.get("NVIDIA_API_KEY", ""))
    if not api_key:
        return None
    base_url = (nvidia_cfg.get("BASE_URL")
                or getattr(settings, "NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"))
    model = (nvidia_cfg.get("MODEL")
             or getattr(settings, "NVIDIA_MODEL", "meta/llama-3.3-70b-instruct"))
    client = OpenAI(api_key=api_key.strip("'\""), base_url=base_url, http_client=httpx.Client())
    return {"name": "nvidia", "client": client, "model": model}


def build_chat_client():
    """Return (resilient_client, primary_model_name).

    The client tries providers in order and fails over automatically. Order is
    driven by DEFAULT_LLM_PROVIDER, but BOTH providers are included whenever
    their keys are present, so either one going down is survivable.
    """
    llm_providers = getattr(settings, "LLM_PROVIDERS", {})
    default_provider = getattr(settings, "DEFAULT_LLM_PROVIDER", "groq").lower()
    groq_key = os.environ.get("GROQ_API_KEY") or llm_providers.get("groq", {}).get("API_KEY")

    groq_p = _make_groq(groq_key, llm_providers) if groq_key else None
    nvidia_p = _make_nvidia(llm_providers)

    # Order providers by configured preference, keeping all available ones.
    if default_provider == "groq":
        ordered = [p for p in (groq_p, nvidia_p) if p]
    else:
        ordered = [p for p in (nvidia_p, groq_p) if p]

    if not ordered:
        logger.warning(
            "No GROQ_API_KEY or NVIDIA_API_KEY configured — LLM calls will fail "
            "and callers will use their fallback behavior."
        )
        # Return a stub that always errors so callers hit their own fallbacks.
        from openai import OpenAI
        stub = {"name": "none", "client": OpenAI(api_key="missing-key"), "model": "missing"}
        return ResilientChatClient([stub]), "missing"

    logger.info(
        "LLM client ready | provider order: %s",
        " -> ".join(f"{p['name']}({p['model']})" for p in ordered),
    )
    return ResilientChatClient(ordered), ordered[0]["model"]
