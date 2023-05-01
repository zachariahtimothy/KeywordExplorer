import { CreateCompletionRequest, CreateCompletionResponse } from "openai";
import { StateCreator } from "zustand";
import { MainSlice, openAi } from "./main";
import type { AxiosError } from "axios";

export interface CompletionSlice {
  messages: string[];
  completionResponses: CreateCompletionResponse[];
  createCompletion: (
    request: Omit<CreateCompletionRequest, "model">
  ) => Promise<void>;
}

export const createCompletionSlice: StateCreator<
  MainSlice & CompletionSlice,
  [],
  [],
  CompletionSlice
> = (set, get) => ({
  messages: [],
  completionResponses: [],
  createCompletion: async (request) => {
    const store = get();
    try {
      const response = await openAi.createCompletion({
        max_tokens: 30,
        temperature: 0.4,
        top_p: 1,
        logprobs: 1,
        n: 1,
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
        stream: false,
        ...request,
        model: store.selectedModelId,
      });
      if (response.data) {
        set({
          completionResponses: store.completionResponses.concat(response.data),
        });
      }
    } catch (error) {
      set({ requestError: error as AxiosError });
    }
  },
});
