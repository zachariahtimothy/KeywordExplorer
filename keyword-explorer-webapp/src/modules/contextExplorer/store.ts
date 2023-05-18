import { StateCreator, create } from "zustand";
import { MainSlice, createMainSlice, openAi } from "../openAi/stores/main";
import {
  CompletionSlice,
  createCompletionSlice,
} from "../openAi/stores/completion";
import { FormEventHandler } from "react";
import {
  DataFrame,
  concat as danfoConcat,
} from "danfojs/dist/danfojs-browser/src/index";
import { getDb } from "../../lib/db";
import type { JSX } from "@ionic/core";
import OpenAiEmbeddings from "./openAiEmbeddings";
import { randomNumber, range } from "../../lib/utilities";
import { InMemoryFileStore } from "langchain/stores/file/in_memory";
import { ReadFileTool, WriteFileTool } from "langchain/tools";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { AutoGPT } from "langchain/experimental/autogpt";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Document } from "langchain/document";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import { ExplorerGPT } from "./explorergpt";

// const pyWorker = new ComlinkWorker<typeof import("./py.worker")>(
//   new URL("./py.worker.ts", import.meta.url)
// );
// const pyodideWorker = new ComlinkWorker<typeof import("./pyodide.worker")>(
//   new URL("./pyodide.worker.ts", import.meta.url)
// );

// const result = await pyWorker.executeScript(
//   pyodideWorker,
//   "testMe",
//   "say",
//   [1, 2]
// );
const inMemoryStore = new InMemoryFileStore();
const vectorStore = new MemoryVectorStore(
  new OpenAIEmbeddings({ openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY })
);
const chatOpenAi = new ChatOpenAI({
  openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
  temperature: 0,
});

const explorerGpt = ExplorerGPT.fromLLMAndTools(chatOpenAi, {
  aiName: "Billy",
  aiRole: "Assistant",
  memory: vectorStore.asRetriever(),
  maxIterations: 1,
  automaticPrompt: PromptTemplate.fromTemplate(
    "Create a {promptType} that uses the following context\n\nContext{context}"
  ),
});

// const autogpt = AutoGPT.fromLLMAndTools(
//   new ChatOpenAI({
//     openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
//     temperature: 0,
//   }),
//   tools,
//   {
//     memory: vectorStore.asRetriever(),
//     aiName: "Tom",
//     aiRole: "Assistant",
//   }
// );

export type AutomaticPromptType =
  | "question"
  | "tweet"
  | "science tweet"
  | "thread"
  | "factoid"
  | "press release";

export const explorerActions = [
  { text: "Ask Question", value: "askQuestion" },
  { text: "Summarize", value: "summarize" },
  { text: "Narrative", value: "narrative" },
  { text: "Extend", value: "extend" },
];

const defaultSummaryLevelOptions = ["all", "raw only", "all summaries"];

async function loadDataCallback(
  projectId: number,
  projectIdList: string[],
  summaryLevel: string
) {
  const db = await getDb();
  await db.open();
  const oae = new OpenAiEmbeddings(db, openAi);

  const dataFrameList: DataFrame[] = [];

  let query = "";
  let queryValues: unknown[] = [];
  let dataFrame = new DataFrame();

  if (summaryLevel === "raw only" || summaryLevel === "all") {
    query =
      "SELECT text_id, parsed_text, embedding FROM source_text_view WHERE source_id = ?";
    queryValues = [projectId];
    if (projectIdList.length > 0) {
      query =
        "SELECT text_id, parsed_text, embedding FROM source_text_view WHERE source_id in (?);";
      queryValues = [projectIdList.toString()];
    }
    const result = await db.query(query, queryValues);

    if (result.values) {
      const vectors: number[][] = [];
      const docs: Document[] = [];
      for (const element of result.values) {
        const value = element;
        await inMemoryStore.writeFile(value.text_id, value.parsed_text);
        const embedding = (value.embedding as string)
          .split(",")
          .map((x) => parseFloat(x));
        vectors.push(embedding);

        const doc = new Document({
          pageContent: value.parsed_text,
          metadata: {
            text_id: value.text_id,
          },
        });

        docs.push(doc);

        // vectorStore.addVectors(value.embeddings as number[][], [doc])
      }
      await vectorStore.addVectors(vectors, docs);
    }

    dataFrame = oae.resultsToDataframe(result.values || []);
    dataFrameList.push(dataFrame);
  }

  if (summaryLevel === "all summaries" || summaryLevel === "all") {
    query =
      "SELECT text_id, parsed_text, embedding, origins FROM summary_text_view WHERE proj_id = ?;";
    queryValues = [projectId];
    if (projectIdList.length > 0) {
      query =
        "SELECT text_id, parsed_text, embedding, origins FROM summary_text_view WHERE proj_id in (?);";
      queryValues = [projectIdList.toString()];
    }
    const result = await db.query(query, queryValues);
    dataFrame = oae.resultsToDataframe(result.values || []);
    dataFrameList.push(dataFrame);
  }

  if (summaryLevel === "all") {
    dataFrame = danfoConcat({ dfList: dataFrameList, axis: 0 }) as DataFrame;
  }

  try {
    const level = parseInt(summaryLevel);

    if (!Number.isNaN(level)) {
      console.log("summary level", level);
      query =
        "SELECT text_id, parsed_text, embedding, origins FROM summary_text_view WHERE level = ? and proj_id = ?;";
      queryValues = [level, projectId];
      if (projectIdList.length > 0) {
        console.log(
          `ContextExplorer.load_data_callback(): loading level ${level} for sources ${projectIdList.toString()}`
        );
        query =
          "SELECT text_id, parsed_text, embedding, origins FROM summary_text_view WHERE level = ? and proj_id in (?);";
        queryValues = [level, projectIdList.toString()];
      }
      console.log("query", query, queryValues);
      const result = await db.query(query, queryValues);
      console.log("result", result);
      dataFrame = oae.resultsToDataframe(result.values || []);
    }
    return dataFrame;
    // const result = oae.createContext(prompt);
  } catch (error) {
    console.warn("error", error);
  } finally {
    console.log("dv", dataFrame);
    await db.close();
  }
}
interface Project {
  name: string;
}
interface ContextExplorerSlice {
  projectOptions: Project[];
  selectedProjectId: number | null;
  projectIdList: string[];
  initComplete: boolean;
  summaryLevelOptions: string[];
  init: () => Promise<void>;
  onProjectSelected: (value: string) => void;
  onSummarySelected: (value: string) => void;
  onFormSubmit: FormEventHandler<HTMLFormElement>;
  onAutomaticButtonClick: (type: AutomaticPromptType) => void;
  dataFrame: DataFrame | null;
  prompt: string;
  contextField: string;
  sourcesField: string;
  responseField: string;
  onTextareaChange: NonNullable<JSX.IonTextarea["onIonInput"]>;
}

export const createExplorerSlice: StateCreator<
  Store,
  [],
  [["zustand/persist", ContextExplorerSlice]],
  ContextExplorerSlice
> = (set, get) => ({
  projectOptions: [],
  selectedProjectId: null,
  projectIdList: [],
  dataFrame: null,
  prompt: "",
  contextField: "",
  sourcesField: "",
  responseField: "",
  summaryLevelOptions: defaultSummaryLevelOptions,
  initComplete: false,
  onTextareaChange: (event) => {
    const name = event.target.name;
    set({
      [name]: event.detail.value,
    });
  },
  onAutomaticButtonClick: async (type) => {
    const df = get().dataFrame;
    if (!df) {
      throw new Error(
        "onAutomaticButtonClick: No data frame, please select a project first"
      );
    }
    const numberOfLines = 10;
    const max =
      df.index.length > numberOfLines
        ? df.index.length - numberOfLines
        : df.index.length;
    const firstLine = randomNumber(0, max);
    const columnIndex = df.columns.findIndex((x) => x === "parsed_text");
    //  s = self.project_df.iloc[first_line]['parsed_text']
    console.log("first line", df);
    const s = df.iloc({ rows: [firstLine], columns: [columnIndex] });

    let promptType = "short question";
    switch (type) {
      case "question":
        promptType = "short question";
        break;
      case "tweet":
        promptType = "short tweet";
        break;
      case "factoid":
        promptType = "factiod";
        break;
      case "science tweet":
        promptType = "short tweet in the style of Science Twitter";
        break;
      case "thread":
        promptType = "science Twitter thread";
        break;
      case "press release":
        {
          let topic = get().prompt;
          if (topic.length < 3) {
            topic = "the book Stampede Theory, by Philip Feldman";
            set({
              prompt: topic,
            });
            promptType = `press release for ${topic}`;
          }
        }
        break;
    }
    let contextString = `Create a ${promptType} that uses the following context\n\nContext:${s.values.at(
      0
    )}`;
    const originsList: number[] = [];
    const originColumnIndex = df.columns.findIndex((x) => x === "origins");
    const parsedTextColumnIndex = df.columns.findIndex(
      (x) => x === "parsed_text"
    );
    for (const i of range(firstLine + 1, firstLine + numberOfLines, 1)) {
      if (df.values?.[i]) {
        try {
          const series = df.values[i] as any[];
          console.log("o", series);
          // const o = series.column("origins");

          // const parsedText = series.at("", "parsed_text");
          const parsedText = series[parsedTextColumnIndex];
          if (parsedText) {
            contextString += `\n\n###\n\n${parsedText}`;
          }

          // const origins = series.at("", "origins");
          // const origins = series.column("origins");
          const origins = series[originColumnIndex];
          console.log("origins loop", origins);
          if (origins) {
            origins.forEach((x) => originsList.push(x as number));
          }
          console.log("i", i, parsedText);
        } catch (error) {
          console.log("no series", df.values, i, error);
        }
      }
    }
    contextString += `\n\n:${promptType}`;
    set({
      contextField: contextString,
    });
    const db = await getDb();
    await db.open();

    const oae = new OpenAiEmbeddings(db, openAi);
    try {
      const origins = await oae.getOriginsText(originsList);
      set({
        sourcesField: origins.join("\n\n"),
      });

      const question = await explorerGpt.runAutomatic({
        promptType,
        context: s.values.at(0),
      });
      // const question = await oae.getResponse(contextString, {
      //   maxTokens: 512,
      //   model: get().selectedModelId,
      // });
      console.log("question", question);
      if (type === "question") {
        set({
          prompt: question,
        });
      } else {
        set({
          responseField: question,
        });
      }
      // if type == PROMPT_TYPE.QUESTION:
      //       self.prompt_text_field.set_text(question)
      //   else:
      //       self.response_text_field.set_text(question)
      //   self.tab_control.select(0)
    } catch (error) {
      console.log("error", error);
    } finally {
      await db.close();
    }
  },
  onSummarySelected: async (value) => {
    const selectedProjectId = get().selectedProjectId;
    if (!selectedProjectId) {
      return;
    }

    const dataFrame = await loadDataCallback(
      selectedProjectId,
      get().projectIdList,
      value
    );
    set({ dataFrame });
  },
  onProjectSelected: async (value) => {
    const [textName, groupName] = value.split(":");

    const db = await getDb();
    await db.open();

    try {
      let query = "SELECT id FROM table_source WHERE group_name = ?";
      if (textName !== "*") {
        query += " AND text_name = ?";
      }
      const results = await db.query(query, [groupName, textName]);
      const selectedProjectId = results.values?.[0]?.id;
      if (results.values?.length) {
        set({
          selectedProjectId: results.values[0].id,
          projectIdList: results.values.map((x) => x.id),
        });
      }
      if (selectedProjectId) {
        const distinctLevelResult = await db.query(
          "select distinct level FROM table_summary_text WHERE source = ?",
          [selectedProjectId]
        );
        if (distinctLevelResult.values?.length) {
          const newSummaryLevelOptions = defaultSummaryLevelOptions.concat(
            distinctLevelResult.values.map((x) => `${x.level}`)
          );
          set({
            summaryLevelOptions: newSummaryLevelOptions,
          });
        }
        const search = new URLSearchParams(window.location.search);
        if (search.has("summaryLevel")) {
          const dataFrame = await loadDataCallback(
            selectedProjectId,
            get().projectIdList,
            search.get("summaryLevel") as string
          );
          set({ dataFrame });
        }
      }
    } finally {
      await db.close();
    }
  },
  onFormSubmit: async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const projectId = formData.get("projectId") as string;
    const summaryLevel = formData.get("summaryLevel") as string;
    const context = formData.get("context") as string;
    const prompt = formData.get("prompt") as string;
    console.log("createExplorerSlice form", formData.get("action"));

    if (!projectId) {
      throw new Error("Please select or create data first");
    }

    const dataFrame = await loadDataCallback(
      parseInt(projectId, 10),
      get().projectIdList,
      summaryLevel
    );
    set({ dataFrame });

    const db = await getDb();
    const oae = new OpenAiEmbeddings(db, openAi);

    if (dataFrame) {
      const p = await oae.createContext(prompt, dataFrame);
    }
  },
  init: async () => {
    const search = new URLSearchParams(window.location.search);
    if (search.has("projectId")) {
      set({
        selectedProjectId: parseInt(search.get("projectId")!, 10),
      });
      get().onProjectSelected(search.get("projectId")!);
    }

    if (get().initComplete) {
      console.log("skip init");
      return;
    }

    const db = await getDb();
    await db.open();

    try {
      const results = await db.query(
        "SELECT * FROM table_source ORDER BY group_name, text_name"
      );
      const entries = await db.query(
        "SELECT group_name, count(group_name) AS entries FROM table_source group by group_name"
      );
      let previousName = "NO-PREV-NAME";
      const projectOptions = results.values?.reduce((accumulator, value) => {
        const { text_name, group_name } = value;
        entries.values?.forEach((entry) => {
          if (
            entry.group_name === group_name &&
            entry.entries > 1 &&
            previousName != group_name
          ) {
            accumulator.push({ name: `*:${group_name}` });
          }
        });
        accumulator.push({ name: `${text_name}:${group_name}` });
        previousName = group_name;
        return accumulator;
      }, [] as Project[]);

      set({
        initComplete: true,
        projectOptions,
      });
    } finally {
      await db.close();
    }
  },
});

interface Store extends MainSlice, CompletionSlice, ContextExplorerSlice {}

export const useContextExplorerStore = create<Store>((...a) => ({
  ...createMainSlice(...a),
  ...createCompletionSlice(...a),
  ...createExplorerSlice(...a),
}));
