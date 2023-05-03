import {
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from "openai";
import { StateCreator } from "zustand";
import { MainSlice, openAi } from "./main";

export interface ChatCompletionSlice {
  conversationMessages: CreateChatCompletionRequest["messages"];
  chatResponses: CreateChatCompletionResponse[];
  createChatCompletion: (
    request: Omit<CreateChatCompletionRequest, "model">
  ) => Promise<void>;
  resetConversation: () => void;
}

export const createChatCompletionSlice: StateCreator<
  MainSlice & ChatCompletionSlice,
  [],
  [],
  ChatCompletionSlice
> = (set, get) => ({
  conversationMessages: [],
  chatResponses: [],
  createChatCompletion: async (request) => {
    const { messages: requestMessages, ...restRequest } = request;
    // Add users message in
    set({
      conversationMessages: get().conversationMessages.concat(requestMessages),
    });

    const response = await openAi.createChatCompletion({
      messages: get().conversationMessages,
      ...restRequest,
      model: get().selectedModelId,
    });

    if (response.data) {
      const newMessages: CreateChatCompletionRequest["messages"] =
        response.data.choices
          .filter((x) => x.message !== undefined)
          .map((x) => ({
            role: x.message!.role,
            content: x.message!.content,
          }));

      set({
        // chatResponses: get().chatResponses.concat(response.data),
        conversationMessages: get().conversationMessages.concat(newMessages),
      });
    }
  },
  resetConversation: () => {
    set({ conversationMessages: [] });
  },
});
