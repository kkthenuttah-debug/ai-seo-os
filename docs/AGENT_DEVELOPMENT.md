# Agent Development Guide

## How to Create a New Agent

1. **Define input/output schemas (Zod)**
   - Create Zod schemas for the payload the agent receives and the JSON it must return.
   - Keep inputs minimal; use context from the run/project when possible.

2. **Implement the agent class**
   - Extend `BaseAgent` from `server/src/agents/base.ts`.
   - Implement `execute()`: call the Gemini router (or low-level client), parse the response, validate with your output schema, return a typed result.
   - Use the provided context (correlationId, projectId, etc.) for logging and metrics.

3. **Register the agent**
   - Add the agent to the registry in `server/src/agents/registry.ts`.
   - Set a unique `id`, `name`, and `category` (e.g. `strategy` or `execution`).

4. **Wire into workflows (optional)**
   - If the agent is part of a multi-step flow, add it to the orchestrator or the relevant worker (e.g. build-worker, optimize-worker).

5. **Tests**
   - Add unit tests in `server/src/__tests__/unit/agents/` that mock the Gemini client and assert output shape and error handling.
   - Add integration tests that run the agent (or a stub) via the API if needed.

## Agent Interface

- **Input:** Typed object validated by Zod; provided by the worker or API.
- **Output:** Typed object validated by Zod; stored in the run record and returned to the client.
- **Context:** Correlation ID, project ID, run ID, and any metadata passed through the queue.
- **Errors:** Throw or return a structured error; the base agent and workers will record failures and optionally retry.

## Input/Output Schemas

- Use Zod for both input and output so that malformed data is rejected early.
- Document required and optional fields in the agent’s JSDoc or a shared types file.
- Prefer narrow types (e.g. enums for status) to avoid invalid states.

## System Prompt Guidelines

- Be explicit about the desired output format (e.g. “Return a JSON object with keys: title, summary, sections”).
- Mention the JSON enforcer when relevant: the system will retry with a stricter prompt if the response is not valid JSON.
- Keep prompts within token limits; use configurable timeouts and max tokens from the router/config.

## Testing Agents

- **Unit:** Mock the Gemini client; feed fixed inputs and assert outputs and error paths.
- **Integration:** Use a test project and a real or sandbox Gemini key; run one agent and assert DB and API state.
- **Fixtures:** Reuse input/output samples in `server/src/__tests__/fixtures/` for regression tests.

## Debugging Tips

- Check run records in the DB and via `GET /api/projects/:id/agent-runs/:runId` for input, output, and error messages.
- Use `LOG_LEVEL=debug` and inspect Winston logs for router and agent execution.
- Verify Redis and queue connectivity if jobs are not picked up or stay in “pending”.
- Use `/health/metrics/agents` to see success/failure and latency per agent type.
