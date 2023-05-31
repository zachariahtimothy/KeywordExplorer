import { StateCreator, create } from "zustand";
import { MainSlice, createMainSlice, openAi } from "../openAi/stores/main";
import {
  CompletionSlice,
  createCompletionSlice,
} from "../openAi/stores/completion";
import { FormEventHandler } from "react";
import { DataFrame } from "danfojs/dist/danfojs-browser/src/index";
import OpenAiEmbeddings from "./openAiEmbeddings";
import { Document } from "langchain/docstore";
import {
  DexieVectorMetadata,
  dexieVectorStore,
} from "../../lib/dexieVectorStore";
import { dexieDb } from "../../lib/dexieDb";

const worker = new ComlinkWorker<typeof import("./worker")>(
  new URL("./worker", import.meta.url)
);

interface CorporaSlice {
  onFormSubmit?: FormEventHandler<HTMLFormElement>;
  saveDataset: (params: {
    targetName: string;
    groupName: string;
    file: File;
    summaryLevel: number;
  }) => Promise<void>;
  init: () => Promise<void>;
  initComplete: boolean;
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
  initComplete: false,
  init: async () => {
    if (get().initComplete) {
      return;
    }
    console.log("dexieVectorStore", dexieVectorStore);
    set({ initComplete: true });
  },
  saveDataset: async ({
    targetName,
    groupName,
    file,
    summaryLevel,
  }: Parameters<CorporaSlice["saveDataset"]>[0]) => {
    const fileLines = await worker.parseFileText(file);
    console.info("Getting embeddings");
    const sourceId = await dexieDb.source.add({
      text_name: targetName,
      group_name: groupName,
    });
    const documents: Document<DexieVectorMetadata>[] = fileLines.map(
      (line) => ({
        pageContent: line,
        metadata: { targetName, groupName, summaryLevel, sourceId },
      })
    );
    await dexieVectorStore.addDocuments(documents);

    // const openAiEmbeddings = new OpenAiEmbeddings(openAi);
    // const embeddings = await openAiEmbeddings.getEmbeddings(fileLines);
  },
  // onFormSubmit: async (event) => {
  //   set({ loading: true });
  //   const formData = new FormData(event.currentTarget);
  //   const targetName = formData.get("targetName") as string;
  //   const groupName = formData.get("targetGroup") as string;
  //   const summaryLevel = parseInt(formData.get("summaryLevel") as string);
  //   const file = formData.get("file") as File;
  //   const parseRegex = formData.get("parseRegex") as string;
  //   const fileLines = await worker.parseFileText(file);
  //   console.log("flines", fileLines);

  //   console.info("Getting embeddings");
  //   const openAiEmbeddings = new OpenAiEmbeddings(openAi);
  //   const embeddings = await openAiEmbeddings.getEmbeddings(fileLines);

  //   const dList = fileLines.map((text, index) => {
  //     const { embedding } = embeddings[index];
  //     return {
  //       text,
  //       embedding,
  //     };
  //   });
  //   const dataFrame = new DataFrame(dList);
  //   console.log("Storing dataframe", dataFrame);

  //   try {
  //     await openAiEmbeddings.storeProjectData({
  //       targetName,
  //       groupName,
  //       dataFrame,
  //     });

  //     console.log("ContextExplorer.load_file_callback(): Summarizing Level 1");
  //     await openAiEmbeddings.summaryizeRawText({
  //       targetName,
  //       groupName,
  //       model: get().selectedModelId,
  //       maxTokens: 256,
  //       // maxLines: 25,
  //       maxLines: 5,
  //     });
  //   } catch (error) {
  //     console.error("err", error);
  //   } finally {
  //     console.info("Corpora completed", groupName, targetName);
  //     set({ loading: false });
  //   }
  // },
});

export const useCorporaStore = create<Store>((...a) => ({
  ...createMainSlice(...a),
  ...createCompletionSlice(...a),
  ...createCorporaExplorerSlice(...a),
}));
