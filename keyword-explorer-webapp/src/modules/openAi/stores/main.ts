import { Configuration, ListModelsResponse, OpenAIApi } from "openai";
import { StateCreator } from "zustand";
import type { AxiosError } from "axios";
import { createJSONStorage, persist } from "zustand/middleware";

const configuration = new Configuration({
  organization: import.meta.env.VITE_OPENAI_ORG,
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
});
export const openAi = new OpenAIApi(configuration);

export interface MainSlice {
  models: ListModelsResponse["data"] | null;
  selectedModelId: ListModelsResponse["data"][0]["id"];
  init: () => Promise<void>;
  setSelectedModelId: (modelId: string) => void;
  requestError: AxiosError | null;
}

export const createMainSlice: StateCreator<
  MainSlice,
  [],
  [["zustand/persist", MainSlice], ["zustand/devtools", never]]
> = persist(
  (set, get) => ({
    models: null,
    requestError: null,
    selectedModelId: "gpt-3.5-turbo",
    setSelectedModelId: (id) => {
      set({ selectedModelId: id });
    },
    init: async () => {
      if (!get().models) {
        const response = await openAi.listModels();
        if (response.data) {
          const models = response.data.data;
          models.sort((a, b) => a.id.localeCompare(b.id));
          set({ models });
        }
      }
    },
  }),
  {
    name: "openai-main-store",
    storage: createJSONStorage(() => sessionStorage),
  }
);
