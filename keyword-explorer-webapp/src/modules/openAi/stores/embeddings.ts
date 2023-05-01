import { CreateEmbeddingRequest, CreateEmbeddingResponse } from "openai";
import { StateCreator } from "zustand";
import { MainSlice, openAi } from "./main";
import type { AxiosError } from "axios";

export interface EmbeddingsSlice {
  embeddingResponses: CreateEmbeddingResponse[];
  createEmbedding: (
    request: Omit<CreateEmbeddingRequest, "model">
  ) => Promise<void>;
}

export const createEmbeddingSlice: StateCreator<
  MainSlice & EmbeddingsSlice,
  [],
  [],
  EmbeddingsSlice
> = (set, get) => ({
  embeddingResponses: [],
  createEmbedding: async (request) => {
    const store = get();
    try {
      const response = await openAi.createEmbedding({
        ...request,
        model: store.selectedModelId,
      });
      if (response.data) {
        set({
          embeddingResponses: store.embeddingResponses.concat(response.data),
        });
      }
    } catch (error) {
      set({ requestError: error as AxiosError });
    }
  },
});
