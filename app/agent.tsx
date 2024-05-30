import "server-only";

import { agentExecutor } from "../ai/chain";
import { exposeEndpoints, streamRunnableUI } from "../utils/server";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

const convertChatHistoryToMessages = (
  chat_history: [role: string, content: string][],
) => {
  return chat_history.map(([role, content]) => {
    switch (role) {
      case "human":
        return new HumanMessage(content);
      case "assistant":
      case "ai":
        return new AIMessage(content);
      default:
        return new HumanMessage(content);
    }
  });
};

async function processFile(input: {
  input: string;
  chat_history: [role: string, content: string][];
  file?: string;
}) {
  if (input.file) {
    const imageTemplate = new HumanMessage({
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${input.file}`,
          },
        },
      ],
    });
    return {
      input: input.input,
      chat_history: [
        ...convertChatHistoryToMessages(input.chat_history),
        imageTemplate,
      ],
    };
  } else {
    return {
      input: input.input,
      chat_history: convertChatHistoryToMessages(input.chat_history),
    };
  }
}

async function agent(inputs: {
  input: string;
  chat_history: [role: string, content: string][];
  file?: string;
}) {
  "use server";
  const processedInputs = await processFile(inputs);

  return streamRunnableUI(agentExecutor, processedInputs);
}

export const EndpointsContext = exposeEndpoints({ agent });
