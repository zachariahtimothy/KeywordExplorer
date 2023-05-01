import { CreateChatCompletionRequest, CreateChatCompletionResponse } from "openai";
import { StateCreator } from "zustand";
import { MainSlice, openAi } from "./main";

export interface ChatCompletionSlice {
  messages: string[];
  chatResponses: CreateChatCompletionResponse[];
  createChatCompletion: (request: Omit<CreateChatCompletionRequest, 'model'>) => Promise<void>;
}

export const createChatCompletionSlice: StateCreator<MainSlice & ChatCompletionSlice, [], [], ChatCompletionSlice> = (set, get) => ({
  messages: [],
  chatResponses: [],
  createChatCompletion: async (request) => {
    const store = get();
    const response = await openAi.createChatCompletion({ ...request, model: store.selectedModelId })
    if (response.data) {
      set({ chatResponses: store.chatResponses.concat(response.data) })
    }
  }
})
