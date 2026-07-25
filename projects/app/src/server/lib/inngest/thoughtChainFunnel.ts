import { invoke } from "inngest";
import { inngest } from "./client";
import {
  renderThoughtChainFunnelAscii,
  runThoughtChainFunnelRefinementPipeline,
  thoughtChainFunnelPromptInputSchema,
} from "@/util/prompts/thoughtChainFunnel";

export const generateThoughtChainFunnel = inngest.createFunction(
  {
    id: `thoughtChainFunnel/generate`,
    triggers: [invoke(thoughtChainFunnelPromptInputSchema)],
  },
  async ({ event }) => {
    const input = event.data;

    const result = await runThoughtChainFunnelRefinementPipeline(input);

    const ascii = renderThoughtChainFunnelAscii(result.finalThoughtFunnel);

    return { result, ascii };
  },
);

export const functions = [generateThoughtChainFunnel];
