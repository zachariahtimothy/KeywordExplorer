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
import {
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";

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
  selectedProject: any;
  summaryLevels: any[];
  selectedSummaryLevel: any;
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
  selectedProject: null,
  summaryLevels: [],
  selectedSummaryLevel: null,
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

    const embeddings = await getEmbeddings(fileLines);
    console.log("embeddings", embeddings);
    const dList = fileLines.map((text, index) => {
      const { embedding } = embeddings[index];
      return {
        text,
        embedding,
      };
    });
    console.log("dList", dList);
    const dataFrame = new DataFrame(dList);
    console.log("data frame", dataFrame);
    const sourceQueryResults = await db.query(
      `SELECT * FROM table_source WHERE text_name = ? AND group_name = ?;`,
      [targetName, groupName]
    );
    let sourceId = sourceQueryResults.values?.[0]?.id;
    if (!sourceQueryResults.values || !sourceQueryResults.values.length) {
      console.info(
        `No db entry for '${targetName}' '${groupName}': creating entry`
      );
      const insertResults = await db.query(
        `INSERT INTO table_source (text_name, group_name) VALUES (?, ?);`,
        [targetName, groupName]
      );
      console.log("insertResults", insertResults);
      sourceId = insertResults.values?.[0]?.id;
    }
    console.log("Source Id", sourceId);
    dataFrame.values.forEach(async (row) => {
      // console.log("df row", row);
      const castRow = row as [string, number[]];
      const query = `INSERT INTO gpt_summary.table_parsed_text (source, parsed_text, embedding) VALUES (?, ?, ?)`;
      await db.query(query, [sourceId, castRow[0], castRow[1]]);
    });

    // summarize_raw_text
    const results = await db.query(
      "SELECT * FROM table_source WHERE text_name = ? and group_name = ?",
      [targetName, groupName]
    );
    console.log("summaryic", results);
    if (!results.values) {
      throw new Error(`Unable to find project ${targetName} ${groupName}`);
    }
    const projectId = results.values[0].id;
    await db.close();
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

class OpenAiEmbeddings {
  constructor(private db: SQLiteDBConnection) {}

  async init() {
    await this.db.open();
  }

  async summaryizeRawText(props: {
    targetName: string;
    groupName: string;
    maxLines?: number;
  }) {
    const { targetName, groupName, maxLines = -1 } = props;
  }
}
