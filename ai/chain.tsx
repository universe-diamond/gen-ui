import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createRunnableUI } from "../utils/server";
import { githubRepoTool, githubRepoToolSchema } from "./tools/github_repo";
import { Github, GithubLoading } from "@/components/prebuilt/github";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { getInvoiceData, invoiceSchema } from "./tools/invoice";
import { Invoice, InvoiceLoading } from "@/components/prebuilt/invoice";
import { weatherSchema, weatherData } from "./tools/weather";
import {
  CurrentWeather,
  CurrentWeatherLoading,
} from "@/components/prebuilt/weather";

// write an async sleep function
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const githubTool = new DynamicStructuredTool({
  name: "github_repo",
  description:
    "A tool to fetch details of a Github repository. Given owner and repo names, this tool will return the repo description, stars, and primary language.",
  schema: githubRepoToolSchema,
  func: async (input, config) => {
    const stream = createRunnableUI(config);
    stream.update(<GithubLoading />);

    const result = await githubRepoTool(input);
    if (typeof result === "string") {
      // Failed to parse, return error message
      stream.done(<p>{result}</p>);
      return result;
    }
    // Artificial delay to show off the loading state.
    // SMH! GPT-4o is too fast!
    await sleep(3000);
    console.log("PARSED RESULTS", result);
    stream.done(<Github {...result} />);

    return JSON.stringify(result, null);
  },
});

const invoiceTool = new DynamicStructuredTool({
  name: "get_order_invoice",
  description:
    "A tool to fetch the invoice from an order. Requires an order id.",
  schema: invoiceSchema,
  func: async (input, config) => {
    const stream = createRunnableUI(config);
    stream.update(<InvoiceLoading />);

    const data = getInvoiceData(input);
    // Artificial delay to show off the loading state.
    // SMH! GPT-4o is too fast!
    await sleep(3000);
    stream.done(<Invoice {...data} />);

    return JSON.stringify(data, null);
  },
});

const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description:
    "A tool to fetch the current weather, given a city and state. If the city/state is not provided, ask the user for both the city and state.",
  schema: weatherSchema,
  func: async (input, config) => {
    const stream = createRunnableUI(config);
    stream.update(<CurrentWeatherLoading />);

    const data = await weatherData(input);
    // Artificial delay to show off the loading state.
    // SMH! GPT-4o is too fast!
    // await sleep(3000);
    stream.done(<CurrentWeather {...data} />);

    return JSON.stringify(data, null);
  },
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are an assistant tasked with either using tools to complete the users request, or engaging in conversation.",
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const tools = [githubTool, invoiceTool, weatherTool];

const llm = new ChatOpenAI({
  temperature: 0,
  model: "gpt-4o",
  streaming: true,
});

export const agentExecutor = new AgentExecutor({
  agent: createToolCallingAgent({ llm, tools, prompt }),
  tools,
});
