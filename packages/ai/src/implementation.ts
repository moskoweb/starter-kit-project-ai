import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { isStepCount, streamText, type ToolSet } from "ai";
import { readAiConfig, type AiConfig } from "./config";

export { readAiConfig };
export type { AiConfig, AiEnvironment } from "./config";

// Keep SDK tool inference, including required toolsContext for contextual tools.
type SdkOptions<TOOLS extends ToolSet> = Parameters<typeof streamText<TOOLS>>[0];

export type AiStreamInput<TOOLS extends ToolSet = ToolSet> = Pick<
  SdkOptions<TOOLS>,
  "tools" | "toolsContext" | "onEnd" | "onAbort"
> & {
  /** Trusted server instructions, never taken directly from request input. */
  instructions?: string;
  prompt: string;
  /** Per model step; at most two steps run, including tool-result generation. */
  maxOutputTokens: number;
  abortSignal: AbortSignal;
  /** Required handler. Do not log raw errors containing provider request data. */
  onError: (event: { error: unknown }) => void | PromiseLike<void>;
};

/** Caller must authenticate, authorize and reserve durable quota before invoking. */
export function streamAiText<TOOLS extends ToolSet>(
  config: AiConfig,
  input: AiStreamInput<TOOLS>,
) {
  if (!config.enabled) throw new Error("AI is disabled. Set AI_ENABLED=true to enable it.");
  if (!Number.isSafeInteger(input.maxOutputTokens) || input.maxOutputTokens < 1 || input.maxOutputTokens > 4096) {
    throw new Error("maxOutputTokens must be an integer between 1 and 4096.");
  }
  if (typeof input.prompt !== "string" || !input.prompt.trim() || input.prompt.length > 32_000) {
    throw new Error("prompt must contain between 1 and 32000 characters.");
  }
  input.abortSignal.throwIfAborted();
  const provider = createOpenAICompatible({
    name: "configured-openai-compatible",
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    includeUsage: true,
  });
  return streamText<TOOLS>({
    ...input,
    model: provider(config.model),
    stopWhen: isStepCount(2),
    maxRetries: 0,
    streamRetries: 0,
    timeout: 120_000,
    telemetry: { isEnabled: false, recordInputs: false, recordOutputs: false },
  });
}
