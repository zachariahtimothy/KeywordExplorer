import { create } from "zustand";
import { MainSlice, createMainSlice } from "./main";
import {
  ChatCompletionSlice,
  createChatCompletionSlice,
} from "./chatCompletion";
import { CompletionSlice, createCompletionSlice } from "./completion";
import { createEmbeddingSlice, EmbeddingsSlice } from "./embeddings";

interface Store
  extends MainSlice,
    ChatCompletionSlice,
    CompletionSlice,
    EmbeddingsSlice {}

export const useOpenAiStore = create<Store>((...a) => ({
  ...createMainSlice(...a),
  ...createCompletionSlice(...a),
  ...createChatCompletionSlice(...a),
  ...createEmbeddingSlice(...a),
}));
