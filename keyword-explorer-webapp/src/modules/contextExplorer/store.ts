import { StateCreator, create } from "zustand";
import { MainSlice, createMainSlice, openAi } from "../openAi/stores/main";
import {
  CompletionSlice,
  createCompletionSlice,
} from "../openAi/stores/completion";
import { FormEventHandler } from "react";
import { DataFrame } from "danfojs/dist/danfojs-browser/src/index";
import { getDb } from "../../lib/db";
import { CreateEmbeddingResponse } from "openai";
import OpenAiEmbeddings from "./openAiEmbeddings";

const worker = new ComlinkWorker<typeof import("./worker")>(
  new URL("./worker", import.meta.url)
);

const DEFAULT_EMBEDDING_MODEL = "text-embedding-ada-002";

async function getEmbeddings(fileLines: string[], submitSize = 10, max = -1) {
  // const linesToSubmit = fileLines.filter((_, index) => index < submitSize);
  const chunks = (await worker.chunkArray(fileLines, submitSize)) as string[][];

  async function getEmbeddingChunk(input: string[]) {
    const { data } = await openAi.createEmbedding({
      model: DEFAULT_EMBEDDING_MODEL,
      input,
    });
    return data;
  }
  const results = await Promise.all(chunks.map(getEmbeddingChunk));

  return results.reduce((accumulator, item) => {
    item.data.forEach((x) => accumulator.push(x));
    return accumulator;
  }, [] as CreateEmbeddingResponse["data"]);
}
interface ContextExplorerSlice {}

interface CorporaSlice {
  projects: any[];
  summaryLevels: any[];
  parseRegex: string;
  onFormSubmit: FormEventHandler<HTMLFormElement>;
}
interface Store
  extends MainSlice,
    CompletionSlice,
    ContextExplorerSlice,
    CorporaSlice {}

export const createCorporaExplorerSlice: StateCreator<
  MainSlice & CompletionSlice & ContextExplorerSlice & CorporaSlice,
  [],
  [],
  CorporaSlice
> = (set, get) => ({
  projects: [],
  summaryLevels: [],
  parseRegex: "([.!?()]+)",
  onFormSubmit: async (event) => {
    event.preventDefault();
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
    const embeddings = await getEmbeddings(fileLines);

    const dList = fileLines.map((text, index) => {
      const { embedding } = embeddings[index];
      return {
        text,
        embedding,
      };
    });
    const dataFrame = new DataFrame(dList);
    console.log("Storing dataframe", dataFrame);
    const openAiEmbeddings = new OpenAiEmbeddings(db, openAi);

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
      });
    } catch (error) {
      console.error("err", error);
    } finally {
      await db.close();
    }

    // console.log("df", df);

    // console.log("fileData", fileLines);
    // formData.forEach((value, key) => {
    //   console.log("d, d", key, value);
    // });
  },
});

export const useContextExplorerStore = create<Store>((...a) => ({
  ...createMainSlice(...a),
  ...createCompletionSlice(...a),
  ...createCorporaExplorerSlice(...a),
}));
