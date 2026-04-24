import pytest

from server.services.novel_writing_assistant import (
    NovelWritingAssistantError,
    build_assistant_prompt,
    generate_novel_assistant_draft,
)


def test_build_assistant_prompt_carries_existing_brief():
    system, prompt = build_assistant_prompt(
        stage="outline",
        title="Bell Tower",
        writing_language="简体中文",
        instruction="Make the ending bittersweet.",
        brief={
            "seed": "A bellmaker's son hears a forbidden interval.",
            "characters": "The protagonist wants safety but keeps choosing truth.",
        },
    )

    assert "简体中文" in system
    assert "Bell Tower" in prompt
    assert "A bellmaker's son hears a forbidden interval." in prompt
    assert "chapter count" in prompt
    assert "Make the ending bittersweet." in prompt


@pytest.mark.asyncio
async def test_generate_novel_assistant_draft_requires_gemini_key():
    with pytest.raises(NovelWritingAssistantError, match="GEMINI_API_KEY"):
        await generate_novel_assistant_draft(
            runtime_env={},
            stage="seed",
            title="",
            writing_language="English",
            instruction="",
            brief={},
        )
