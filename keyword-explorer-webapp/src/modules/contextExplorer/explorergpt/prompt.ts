import {
  BaseChatPromptTemplate,
  BasePromptTemplate,
  PromptTemplate,
  SerializedBasePromptTemplate,
} from "langchain/prompts";
import {
  BaseChatMessage,
  HumanChatMessage,
  PartialValues,
  SystemChatMessage,
} from "langchain/schema";
import { getPrompt } from "./prompt_generator";
import { VectorStoreRetriever } from "langchain/vectorstores/base";

export interface ExplorerGPTPromptInput {
  aiName: string;
  aiRole: string;
  tokenCounter: (text: string) => Promise<number>;
  sendTokenLimit?: number;
}

export class ExplorerGPTPrompt
  extends BaseChatPromptTemplate
  implements ExplorerGPTPromptInput
{
  aiName: string;
  aiRole: string;
  tokenCounter: (text: string) => Promise<number>;
  sendTokenLimit: number;

  constructor(fields: ExplorerGPTPromptInput) {
    super({ inputVariables: ["memory", "messages", "user_input"] });
    this.aiName = fields.aiName;
    this.aiRole = fields.aiRole;
    this.tokenCounter = fields.tokenCounter;
    this.sendTokenLimit = fields.sendTokenLimit || 4196;
  }

  constructFullPrompt(goals: string[]): string {
    const promptStart = `Your decisions must always be made independently
            without seeking user assistance. Play to your strengths
            as an LLM and pursue simple strategies with no legal complications.
            If you have completed all your tasks,
            make sure to use the "finish" command.`;

    let fullPrompt = `You are ${this.aiName}, ${this.aiRole}\n${promptStart}`;
    if (goals.length) {
      fullPrompt += "\n\nGOALS:\n\n";
      goals.forEach((goal, index) => {
        fullPrompt += `${index + 1}. ${goal}\n`;
      });
    }

    fullPrompt += `\n\n${getPrompt()}`;
    return fullPrompt;
  }
  async formatMessages({
    memory,
    messages: previousMessages,
    user_input,
  }: {
    memory: VectorStoreRetriever;
    messages: BaseChatMessage[];
    user_input: string;
  }): Promise<BaseChatMessage[]> {
    const timePrompt = new SystemChatMessage(
      `The current time and date is ${new Date().toLocaleString()}`
    );
    const usedTokens = await this.tokenCounter(timePrompt.text);
    const relevantDocs = await memory.getRelevantDocuments(
      JSON.stringify(previousMessages.slice(-10))
    );
    const relevantMemory = relevantDocs.map((d) => d.pageContent);
    let relevantMemoryTokens = await relevantMemory.reduce(
      async (acc, doc) => (await acc) + (await this.tokenCounter(doc)),
      Promise.resolve(0)
    );

    while (usedTokens + relevantMemoryTokens > 2500) {
      relevantMemory.pop();
      relevantMemoryTokens = await relevantMemory.reduce(
        async (acc, doc) => (await acc) + (await this.tokenCounter(doc)),
        Promise.resolve(0)
      );
    }

    const usedTokensWithMemory = usedTokens;
    const historicalMessages: BaseChatMessage[] = [];

    for (const message of previousMessages.slice(-10).reverse()) {
      const messageTokens = await this.tokenCounter(message.text);
      if (usedTokensWithMemory + messageTokens > this.sendTokenLimit - 1000) {
        break;
      }
      historicalMessages.unshift(message);
    }
    const inputMessage = new HumanChatMessage(user_input);
    const messages: BaseChatMessage[] = [
      timePrompt,
      ...historicalMessages,
      inputMessage,
    ];
    return messages;
  }

  partial(_values: PartialValues): Promise<BasePromptTemplate> {
    throw new Error("Method not implemented.");
  }
  _getPromptType(): string {
    return "explorergpt" as const;
  }
  serialize(): SerializedBasePromptTemplate {
    throw new Error("Method not implemented.");
  }
}
