import { VectorStoreRetriever } from "langchain/vectorstores/base";
import { ExplorerGPTOutputParser } from "./output_parser";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { LLMChain } from "langchain/chains";
import { BaseChatModel } from "langchain/chat_models/base";
import {
  AIChatMessage,
  BaseChatMessage,
  ChainValues,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
import { ExplorerGPTPrompt } from "./prompt";
import { FINISH_NAME } from "./schema";
import { PromptTemplate } from "langchain/prompts";

export const getEmbeddingContextSize = (modelName?: string): number => {
  switch (modelName) {
    case "text-embedding-ada-002":
      return 8191;
    default:
      return 2046;
  }
};

export const getModelNameForTiktoken = (modelName: string): string => {
  if (modelName.startsWith("gpt-3.5-turbo-")) {
    return "gpt-3.5-turbo";
  }

  if (modelName.startsWith("gpt-4-32k-")) {
    return "gpt-4-32k";
  }

  if (modelName.startsWith("gpt-4-")) {
    return "gpt-4";
  }

  return modelName as string;
};

export const getModelContextSize = (modelName: string): number => {
  switch (getModelNameForTiktoken(modelName)) {
    case "gpt-3.5-turbo":
      return 4096;
    case "gpt-4-32k":
      return 32768;
    case "gpt-4":
      return 8192;
    case "text-davinci-003":
      return 4097;
    case "text-curie-001":
      return 2048;
    case "text-babbage-001":
      return 2048;
    case "text-ada-001":
      return 2048;
    case "code-davinci-002":
      return 8000;
    case "code-cushman-001":
      return 2048;
    default:
      return 4097;
  }
};

export interface ExplorerGPTInput {
  aiName: string;
  aiRole: string;
  memory: VectorStoreRetriever;
  humanInTheLoop?: boolean;
  outputParser?: ExplorerGPTOutputParser;
  maxIterations?: number;
  automaticPrompt: PromptTemplate;
}

export class ExplorerGPT {
  aiName: string;
  memory: VectorStoreRetriever;

  fullMessageHistory: BaseChatMessage[];

  nextActionCount: number;

  chain: LLMChain;

  outputParser: ExplorerGPTOutputParser;

  maxIterations: number;

  // Currently not generic enough to support any text splitter.
  textSplitter: RecursiveCharacterTextSplitter;
  automaticPrompt: PromptTemplate;

  constructor({
    aiName,
    memory,
    chain,
    outputParser,
    maxIterations,
    automaticPrompt,
  }: Omit<Required<ExplorerGPTInput>, "aiRole" | "humanInTheLoop"> & {
    chain: LLMChain;
    automaticPrompt: PromptTemplate;
  }) {
    this.automaticPrompt = automaticPrompt;
    this.aiName = aiName;
    this.memory = memory;
    this.fullMessageHistory = [];
    this.nextActionCount = 0;
    this.chain = chain;
    this.outputParser = outputParser;
    this.maxIterations = maxIterations;
    const chunkSize = getEmbeddingContextSize(
      "modelName" in memory.vectorStore.embeddings
        ? (memory.vectorStore.embeddings.modelName as string)
        : undefined
    );
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: Math.round(chunkSize / 10),
    });
  }

  static fromLLMAndTools(
    llm: BaseChatModel,
    {
      aiName,
      aiRole,
      memory,
      maxIterations = 100,
      // humanInTheLoop = false,
      outputParser = new ExplorerGPTOutputParser(),
      automaticPrompt,
    }: ExplorerGPTInput
  ): ExplorerGPT {
    const prompt = new ExplorerGPTPrompt({
      aiName,
      aiRole,
      tokenCounter: llm.getNumTokens.bind(llm),
      sendTokenLimit: getModelContextSize(
        "modelName" in llm ? (llm.modelName as string) : "gpt2"
      ),
    });
    const chain = new LLMChain({ llm, prompt });
    return new ExplorerGPT({
      aiName,
      memory,
      chain,
      outputParser,
      maxIterations,
      automaticPrompt,
    });
  }

  async runAutomatic(chainValues: ChainValues): Promise<string | undefined> {
    const user_input = await this.automaticPrompt.format(chainValues);
    const { text: assistantReply } = await this.chain.call({
      user_input,
      // user_input,
      memory: this.memory,
      messages: this.fullMessageHistory,
    });
    this.fullMessageHistory.push(new HumanChatMessage(user_input));
    this.fullMessageHistory.push(new AIChatMessage(assistantReply));

    const memoryToAdd = `Assistant Reply: ${assistantReply}\nResult: ${assistantReply} `;
    const documents = await this.textSplitter.createDocuments([memoryToAdd]);
    await this.memory.addDocuments(documents);
    this.fullMessageHistory.push(new SystemChatMessage(assistantReply));
    return assistantReply;
  }
  async run(user_input: string): Promise<string | undefined> {
    // const user_input =
    //   "Determine which next command to use, and respond using the format specified above:";
    let loopCount = 0;
    while (loopCount < this.maxIterations) {
      loopCount += 1;

      const { text: assistantReply } = await this.chain.call({
        user_input,
        memory: this.memory,
        messages: this.fullMessageHistory,
      });

      // Print the assistant reply
      console.log({ assistantReply });
      this.fullMessageHistory.push(new HumanChatMessage(user_input));
      this.fullMessageHistory.push(new AIChatMessage(assistantReply));

      const action = await this.outputParser.parse(assistantReply);
      console.log("action", action);
      if (action.name === FINISH_NAME) {
        return action.text;
      }
      let result = action.text;

      if (action.name === "ERROR") {
        result = `Error: ${action.text}. `;
      } else {
        result = `Unknown command '${action.name}'. Please refer to the 'COMMANDS' list for available commands and only respond in the specified JSON format.`;
      }
      const memoryToAdd = `Assistant Reply: ${assistantReply}\nResult: ${result} `;
      const documents = await this.textSplitter.createDocuments([memoryToAdd]);
      await this.memory.addDocuments(documents);
      this.fullMessageHistory.push(new SystemChatMessage(result));
    }
    return undefined;
  }
}
