import pytest

from server.services.novel_writing_assistant import (
    NovelWritingAssistantError,
    build_assistant_chat_prompt,
    build_assistant_prompt,
    generate_novel_assistant_chat,
    generate_novel_assistant_draft,
    parse_assistant_chat_response,
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


def test_build_assistant_chat_prompt_guides_by_stage():
    system, prompt = build_assistant_chat_prompt(
        stage="characters",
        title="Bell Tower",
        writing_language="English",
        message="Make the antagonist less generic.",
        brief={"seed": "A forbidden interval can wake the buried city."},
        confirmed={"seed": True, "style": True},
        messages=[
            {"role": "user", "content": "I want a tense family story."},
            {"role": "assistant", "content": "Let's shape the character pressure."},
        ],
    )

    assert "conversational novel writing agent" in system
    assert "Characters" in prompt
    assert "A forbidden interval can wake the buried city." in prompt
    assert "I want a tense family story." in prompt
    assert '"draft"' in prompt


def test_parse_assistant_chat_response_extracts_json():
    result = parse_assistant_chat_response(
        '{"stage":"seed","reply":"Drafted.","draft":"A bellmaker lies to save his sister.","ready_to_confirm":true}',
        "style",
    )

    assert result["stage"] == "seed"
    assert result["reply"] == "Drafted."
    assert result["draft"] == "A bellmaker lies to save his sister."
    assert result["ready_to_confirm"] is True


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


@pytest.mark.asyncio
async def test_generate_novel_assistant_chat_requires_gemini_key():
    with pytest.raises(NovelWritingAssistantError, match="GEMINI_API_KEY"):
        await generate_novel_assistant_chat(
            runtime_env={},
            stage="seed",
            title="",
            writing_language="English",
            message="Draft the seed.",
            brief={},
            confirmed={},
            messages=[],
        )
