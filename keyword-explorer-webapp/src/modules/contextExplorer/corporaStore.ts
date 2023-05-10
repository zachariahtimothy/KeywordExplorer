import { StateCreator, create } from "zustand";
import { MainSlice, createMainSlice, openAi } from "../openAi/stores/main";
import {
  CompletionSlice,
  createCompletionSlice,
} from "../openAi/stores/completion";
import { FormEventHandler } from "react";
import { DataFrame } from "danfojs/dist/danfojs-browser/src/index";
import { getDb } from "../../lib/db";
import OpenAiEmbeddings from "./openAiEmbeddings";
import type { JSX } from "@ionic/core";

const worker = new ComlinkWorker<typeof import("./worker")>(
  new URL("./worker", import.meta.url)
);

interface CorporaSlice {
  onFormSubmit: FormEventHandler<HTMLFormElement>;
  loading: boolean;
}
interface Store extends MainSlice, CompletionSlice, CorporaSlice {}

export const createCorporaExplorerSlice: StateCreator<
  MainSlice & CompletionSlice & CorporaSlice,
  [],
  [],
  CorporaSlice
> = (set, get) => ({
  loading: false,
  onFormSubmit: async (event) => {
    event.preventDefault();
    set({ loading: true });
    const formData = new FormData(event.currentTarget);
    const targetName = formData.get("targetName") as string;
    const groupName = formData.get("targetGroup") as string;
    const summaryLevel = parseInt(formData.get("summaryLevel") as string);
    const file = formData.get("file") as File;
    const parseRegex = formData.get("parseRegex") as string;
    const fileLines = await worker.parseFileText(file, new RegExp(parseRegex));

    const db = await getDb();
    await db.open();

    console.info("Getting embeddings");
    const openAiEmbeddings = new OpenAiEmbeddings(db, openAi);
    const embeddings = await openAiEmbeddings.getEmbeddings(fileLines);

    const dList = fileLines.map((text, index) => {
      const { embedding } = embeddings[index];
      return {
        text,
        embedding,
      };
    });
    const dataFrame = new DataFrame(dList);
    console.log("Storing dataframe", dataFrame);

    try {
      await openAiEmbeddings.storeProjectData({
        targetName,
        groupName,
        dataFrame,
      });

      console.log("ContextExplorer.load_file_callback(): Summarizing Level 1");
      await openAiEmbeddings.summaryizeRawText({
        targetName,
        groupName,
        model: get().selectedModelId,
        maxTokens: 256,
        maxLines: 25,
      });
    } catch (error) {
      console.error("err", error);
    } finally {
      console.info("Corpora completed", groupName, targetName);
      set({ loading: false });
      await db.close();
    }
  },
});

export const useCorporaStore = create<Store>((...a) => ({
  ...createMainSlice(...a),
  ...createCompletionSlice(...a),
  ...createCorporaExplorerSlice(...a),
}));
