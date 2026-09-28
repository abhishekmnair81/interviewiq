# Changelog

## [Unreleased]
### Added
- **Resume-Driven Interviewing**:
  - `apps/analysis/services/question_generator.py`: Updated `generate_next_question` to explicitly and strongly prompt the LLM (`llama-3.3-70b-versatile`) to reference named projects, skills, or roles from the `resume_highlights` context.
  - `apps/analysis/services/coding_question_generator.py`: Added a new LLM-driven coding question generator that uses the candidate's resume highlights and level to construct a bespoke programming challenge. It also validates its generated reference solution against OneCompiler before returning it.
  - `apps/analysis/consumers.py`: Wired the `CodingQuestionGenerator` into the WebSocket loop at Q6. If `used_resume` is active and a resume is present, the dynamic challenge is delivered. Otherwise, it gracefully falls back to the static `CODING_QUESTIONS` pool. Modified `submit_code` to append generated test cases for code execution.

### Changed
- `apps/analysis/services/question_generator.py`, `coding_question_generator.py`, `answer_evaluator.py`, `level_detector.py`: Reverted model ID back to the valid `qwen/qwen3.8-27b` Groq model.
