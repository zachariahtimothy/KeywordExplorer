import { StateCreator, create } from "zustand";
import { MainSlice, createMainSlice } from "../openAi/stores/main";
import {
  CompletionSlice,
  createCompletionSlice,
} from "../openAi/stores/completion";
import { FormEventHandler } from "react";
import { DataFrame } from "danfojs/dist/danfojs-browser/src/index";
import type { JSX } from "@ionic/core";
import { randomNumber } from "../../lib/utilities";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { ExplorerGPT } from "./explorergpt";
import { dexieDb } from "../../lib/dexieDb";
import {
  DexieVectorMetadata,
  dexieVectorStore,
} from "../../lib/dexieVectorStore";
import { Collection, IndexableType } from "dexie";
import { DexieDocument } from "../../lib/DexieVectorStore/db";

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
// const vectorStore = new MemoryVectorStore(
//   new OpenAIEmbeddings({ openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY })
// );

const chatOpenAi = new ChatOpenAI({
  openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
  temperature: 0,
});

const explorerGpt = ExplorerGPT.fromLLMAndTools(chatOpenAi, {
  aiName: "Billy",
  aiRole: "Assistant",
  memory: dexieVectorStore.asRetriever(),
  maxIterations: 1,
  automaticPrompt: PromptTemplate.fromTemplate(
    "Create a {promptType} that uses the following context\n\nContext:###{context}###"
  ),
});

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
  projectIdList: number[],
  summaryLevel: string
) {
  let collection: Collection<DexieDocument<DexieVectorMetadata>, IndexableType>;
  if (summaryLevel === "raw only" || summaryLevel === "all") {
    if (projectIdList.length) {
      collection = dexieVectorStore.db.documents
        .where("metadata.sourceId")
        .equals(projectId);
    } else {
      collection = dexieVectorStore.db.documents
        .where("metadata.sourceId")
        .anyOf(projectIdList);
    }
    await collection.each((doc) => {
      if (
        dexieVectorStore.memoryVectors.findIndex((x) => x.id === doc.id) === -1
      ) {
        dexieVectorStore.memoryVectors.push(doc);
      }
    });
  }

  if (summaryLevel === "all summaries" || summaryLevel === "all") {
    // TODO: Add summaries
  }

  try {
    const level = parseInt(summaryLevel);
    if (!Number.isNaN(level)) {
      await dexieVectorStore.db.documents
        .where("metadata.summaryLevel")
        .equals(level)
        .each((doc) => {
          if (
            dexieVectorStore.memoryVectors.findIndex((x) => x.id === doc.id) ===
            -1
          ) {
            dexieVectorStore.memoryVectors.push(doc);
          }
        });
    }
  } catch (error) {
    console.error(
      "loadDataCallback",
      "error getting summary level data",
      error
    );
  }

  console.log("result", dexieVectorStore.memoryVectors);

  // if (summaryLevel === "all summaries" || summaryLevel === "all") {
  //   query =
  //     "SELECT text_id, parsed_text, embedding, origins FROM summary_text_view WHERE proj_id = ?;";
  //   queryValues = [projectId];
  //   if (projectIdList.length > 0) {
  //     query =
  //       "SELECT text_id, parsed_text, embedding, origins FROM summary_text_view WHERE proj_id in (?);";
  //     queryValues = [projectIdList.toString()];
  //   }
  //   const result = await db.query(query, queryValues);
  //   dataFrame = oae.resultsToDataframe(result.values || []);
  //   dataFrameList.push(dataFrame);
  // }

  // if (summaryLevel === "all") {
  //   dataFrame = danfoConcat({ dfList: dataFrameList, axis: 0 }) as DataFrame;
  // }

  // try {
  //   const level = parseInt(summaryLevel);

  //   if (!Number.isNaN(level)) {
  //     console.log("summary level", level);
  //     query =
  //       "SELECT text_id, parsed_text, embedding, origins FROM summary_text_view WHERE level = ? and proj_id = ?;";
  //     queryValues = [level, projectId];
  //     if (projectIdList.length > 0) {
  //       console.log(
  //         `ContextExplorer.load_data_callback(): loading level ${level} for sources ${projectIdList.toString()}`
  //       );
  //       query =
  //         "SELECT text_id, parsed_text, embedding, origins FROM summary_text_view WHERE level = ? and proj_id in (?);";
  //       queryValues = [level, projectIdList.toString()];
  //     }
  //     console.log("query", query, queryValues);
  //     const result = await db.query(query, queryValues);
  //     console.log("result", result);
  //     dataFrame = oae.resultsToDataframe(result.values || []);
  //   }
  //   return dataFrame;
  //   // const result = oae.createContext(prompt);
  // } catch (error) {
  //   console.warn("error", error);
  // } finally {
  //   console.log("dv", dataFrame);
  //   // await db.close();
  // }
}
interface Project {
  id: number;
  name: string;
}
interface ContextExplorerSlice {
  projectOptions: Project[];
  selectedProjectId: number | null;
  projectIdList: string[];
  initComplete: boolean;
  summaryLevelOptions: string[];
  init: () => Promise<void>;
  initError: Error | null;
  onProjectSelected: (value: string) => Promise<void>;
  onSummarySelected: (value: string) => Promise<void>;
  onFormSubmit: FormEventHandler<HTMLFormElement>;
  resetForm: () => void;
  onAutomaticButtonClick: (type: AutomaticPromptType) => void;
  dataFrame: DataFrame | null;
  prompt: string;
  contextField: string;
  sourcesField: string;
  responseField: string;
  onTextareaChange: NonNullable<JSX.IonTextarea["onIonInput"]>;
  chatHistory: typeof explorerGpt.fullMessageHistory;
}

export const createExplorerSlice: StateCreator<
  Store,
  [],
  [["zustand/persist", ContextExplorerSlice]],
  ContextExplorerSlice
> = (set, get) => ({
  initError: null,
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
  chatHistory: [],
  onTextareaChange: (event) => {
    const name = event.target.name;
    set({
      [name]: event.detail.value,
    });
  },
  onAutomaticButtonClick: async (type) => {
    // const df = get().dataFrame;
    // if (!df) {
    //   throw new Error(
    //     "onAutomaticButtonClick: No data frame, please select a project first"
    //   );
    // }
    const numberOfLines = 10;
    const max =
      dexieVectorStore.memoryVectors.length > numberOfLines
        ? dexieVectorStore.memoryVectors.length - numberOfLines
        : dexieVectorStore.memoryVectors.length;
    const firstLineIndex = randomNumber(0, max);

    const documentToUse = dexieVectorStore.memoryVectors[firstLineIndex];

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
    const { assistantReply, context } = await explorerGpt.runAutomatic({
      promptType,
      context: documentToUse.content,
    });
    console.log("context", context);
    if (type === "question") {
      set({
        prompt: assistantReply,
        contextField: context,
      });
    } else {
      set({
        responseField: assistantReply,
        contextField: context,
      });
    }
    // let contextString = `Create a ${promptType} that uses the following context\n\nContext:${s.values.at(
    //   0
    // )}`;
    // const originsList: number[] = [];
    // const originColumnIndex = df.columns.findIndex((x) => x === "origins");
    // const parsedTextColumnIndex = df.columns.findIndex(
    //   (x) => x === "parsed_text"
    // );
    // for (const i of range(firstLine + 1, firstLine + numberOfLines, 1)) {
    //   if (df.values?.[i]) {
    //     try {
    //       const series = df.values[i] as any[];
    //       console.log("o", series);
    //       // const o = series.column("origins");

    //       // const parsedText = series.at("", "parsed_text");
    //       const parsedText = series[parsedTextColumnIndex];
    //       if (parsedText) {
    //         contextString += `\n\n###\n\n${parsedText}`;
    //       }

    //       // const origins = series.at("", "origins");
    //       // const origins = series.column("origins");
    //       const origins = series[originColumnIndex];
    //       console.log("origins loop", origins);
    //       if (origins) {
    //         origins.forEach((x) => originsList.push(x as number));
    //       }
    //       console.log("i", i, parsedText);
    //     } catch (error) {
    //       console.log("no series", df.values, i, error);
    //     }
    //   }
    // }
    // contextString += `\n\n:${promptType}`;
    // set({
    //   contextField: contextString,
    // });
    // const db = await getDb();
    // await db.open();

    // const oae = new OpenAiEmbeddings(openAi);
    // try {
    //   const origins = await oae.getOriginsText(originsList);
    //   set({
    //     sourcesField: origins.join("\n\n"),
    //   });

    //   const question = await explorerGpt.runAutomatic({
    //     promptType,
    //     context: s.values.at(0),
    //   });
    //   // const question = await oae.getResponse(contextString, {
    //   //   maxTokens: 512,
    //   //   model: get().selectedModelId,
    //   // });
    //   console.log("question", question);
    //   if (type === "question") {
    //     set({
    //       prompt: question,
    //     });
    //   } else {
    //     set({
    //       responseField: question,
    //     });
    //   }
    //   // if type == PROMPT_TYPE.QUESTION:
    //   //       self.prompt_text_field.set_text(question)
    //   //   else:
    //   //       self.response_text_field.set_text(question)
    //   //   self.tab_control.select(0)
    // } catch (error) {
    //   console.log("error", error);
    // } finally {
    //   await db.close();
    // }
  },
  onSummarySelected: async (value) => {
    const selectedProjectId = get().selectedProjectId;
    if (!selectedProjectId) {
      return;
    }

    await loadDataCallback(
      selectedProjectId,
      get().projectOptions.map((x) => x.id),
      value
    );
    // set({ dataFrame });
  },
  onProjectSelected: async (value) => {
    const [textName, groupName] = value.split(":");

    const collection = dexieDb.source.where({ group_name: groupName });

    if (textName !== "*") {
      collection.and((x) => x.text_name === textName);
    }
    let selectedProjectId: number | undefined;
    try {
      const results = await collection.limit(1).toArray();
      selectedProjectId = results?.[0]?.id;
      if (results.length) {
        set({
          selectedProjectId: results[0].id,
        });
      }
    } catch (error) {
      console.error("onProjectSelected error", error);
    }
    if (selectedProjectId) {
      const distinctLevels = new Map<number, string>();
      await dexieVectorStore.db.documents
        .where("metadata.sourceId")
        .equals(selectedProjectId)
        .each((doc) => {
          if (doc.metadata) {
            distinctLevels.set(
              doc.metadata?.summaryLevel,
              doc.metadata?.summaryLevel.toString()
            );
          }
        });
      const summaryLevelOptions = get()
        .summaryLevelOptions.concat(...distinctLevels.values())
        .filter((value, index, array) => array.indexOf(value) === index);
      set({
        summaryLevelOptions: summaryLevelOptions,
      });

      const search = new URLSearchParams(window.location.search);
      if (search.has("summaryLevel")) {
        await loadDataCallback(
          selectedProjectId,
          get().projectOptions.map((x) => x.id),
          search.get("summaryLevel") as string
        );
      }
    }

    // const results = await db.query(query, [groupName, textName]);

    //   if (results.length) {

    //   if (selectedProjectId) {
    //     const distinctLevelResult = await dexieDb.summaryText
    //       .where({ source: selectedProjectId })
    //       .toArray();
    //     // const distinctLevelResult = await db.query(
    //     //   "select distinct level FROM table_summary_text WHERE source = ?",
    //     //   [selectedProjectId]
    //     // );
    //     if (distinctLevelResult.length) {
    //       const newSummaryLevelOptions = defaultSummaryLevelOptions.concat(
    //         distinctLevelResult.map((x) => `${x.level}`)
    //       );
    //       set({
    //         summaryLevelOptions: newSummaryLevelOptions,
    //       });
    //     }
    //     const search = new URLSearchParams(window.location.search);
    //     if (search.has("summaryLevel")) {
    //       const dataFrame = await loadDataCallback(
    //         selectedProjectId,
    //         get().projectIdList,
    //         search.get("summaryLevel") as string
    //       );
    //       set({ dataFrame });
    //     }
    //   }
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

    // const dataFrame = await loadDataCallback(
    //   parseInt(projectId, 10),
    //   get().projectIdList,
    //   summaryLevel
    // );
    // set({ dataFrame });
    const result = await explorerGpt.askQuestion(prompt);
    set({
      chatHistory: explorerGpt.fullMessageHistory,
    });
    console.log("submit result", result, explorerGpt.fullMessageHistory);
    // const db = await getDb();
    // const oae = new OpenAiEmbeddings(db);

    // if (dataFrame) {
    //   const p = await oae.createContext(prompt, dataFrame);
    // }
  },
  resetForm: () => {
    set({
      contextField: undefined,
      prompt: undefined,
    });
  },
  init: async () => {
    if (get().initComplete) {
      console.log("skip init");
      return;
    }

    const search = new URLSearchParams(window.location.search);
    if (search.has("projectId")) {
      set({
        selectedProjectId: parseInt(search.get("projectId")!, 10),
      });
      get().onProjectSelected(search.get("projectId")!);
    }

    try {
      const results = await dexieDb.source
        .orderBy(["group_name", "text_name"])
        .toArray();

      const projectOptions = results.reduce((accumulator, source) => {
        const name = `${source.text_name}:${source.group_name}`;
        if (accumulator.find((x) => x.name === name)) {
          accumulator.push({ id: source.id!, name: `*:${source.group_name}` });
        } else {
          accumulator.push({ id: source.id!, name });
        }
        return accumulator;
      }, [] as Project[]);
      set({
        initComplete: true,
        projectOptions,
      });
    } catch (error) {
      console.error("err", error);
    }

    // try {
    //   const results = await db.query(
    //     "SELECT * FROM table_source ORDER BY group_name, text_name"
    //   );
    //   const entries = await db.query(
    //     "SELECT group_name, count(group_name) AS entries FROM table_source group by group_name"
    //   );
    //   let previousName = "NO-PREV-NAME";
    //   const projectOptions = results.values?.reduce((accumulator, value) => {
    //     const { text_name, group_name } = value;
    //     entries.values?.forEach((entry) => {
    //       if (
    //         entry.group_name === group_name &&
    //         entry.entries > 1 &&
    //         previousName != group_name
    //       ) {
    //         accumulator.push({ name: `*:${group_name}` });
    //       }
    //     });
    //     accumulator.push({ name: `${text_name}:${group_name}` });
    //     previousName = group_name;
    //     return accumulator;
    //   }, [] as Project[]);

    //   set({
    //     initComplete: true,
    //     projectOptions,
    //   });
    // } finally {
    //   // await db.close();
    // }
  },
});

interface Store extends MainSlice, CompletionSlice, ContextExplorerSlice {}

export const useContextExplorerStore = create<Store>((...a) => ({
  ...createMainSlice(...a),
  ...createCompletionSlice(...a),
  ...createExplorerSlice(...a),
}));
