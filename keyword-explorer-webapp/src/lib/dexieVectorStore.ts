import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { DexieVectorStore } from "./DexieVectorStore/dexie";

export interface DexieVectorMetadata {
  targetName: string;
  groupName: string;
  summaryLevel: number;
  sourceId: number;
}

export const dexieVectorStore = new DexieVectorStore<DexieVectorMetadata>(
  new OpenAIEmbeddings({ openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY }),
  {
    collectionName: "dexie-vector",
    extraDbIndexes: ["metadata.sourceId", "metadata.summaryLevel"],
  }
);
