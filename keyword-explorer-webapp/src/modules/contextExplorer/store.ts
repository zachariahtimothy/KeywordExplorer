import { StateCreator, create } from "zustand";
import { MainSlice, createMainSlice } from "../openAi/stores/main";
import {
  CompletionSlice,
  createCompletionSlice,
} from "../openAi/stores/completion";
import { FormEventHandler } from "react";
import { DataFrame } from "danfojs/dist/danfojs-browser/src/index";
import { getDb } from "../../lib/db";
import type { JSX } from "@ionic/core";

export const explorerActions = [
  { text: "Ask Question", value: "askQuestion" },
  { text: "Summarize", value: "summarize" },
  { text: "Narrative", value: "narrative" },
  { text: "Extend", value: "extend" },
];

interface Project {
  name: string;
}
interface ContextExplorerSlice {
  projectOptions: Project[];
  selectedProjectId: string | null;
  projectIdList: string[];
  initComplete: boolean;
  summaryLevelOptions: string[];
  init: () => Promise<void>;
  onProjectSelected: JSX.IonSelect["onIonChange"];
  onFormSubmit: FormEventHandler<HTMLFormElement>;
}

export const createExplorerSlice: StateCreator<
  MainSlice & CompletionSlice & ContextExplorerSlice,
  [],
  [],
  ContextExplorerSlice
> = (set, get) => ({
  projectOptions: [],
  selectedProjectId: null,
  projectIdList: [],
  summaryLevelOptions: ["all", "raw only", "all summaries"],
  initComplete: false,
  onProjectSelected: async ({ detail }) => {
    const { value } = detail;
    const [textName, groupName] = (value as string).split(":");

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
          "select distinct level from table_summary_text where source = ?",
          [selectedProjectId]
        );
        if (distinctLevelResult.values?.length) {
          const newSummaryLevelOptions = get().summaryLevelOptions.concat(
            distinctLevelResult.values.map((x) => `${x.level}`)
          );
          set({
            summaryLevelOptions: newSummaryLevelOptions,
          });
        }
      }
    } finally {
      await db.close();
    }
  },
  onFormSubmit: async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const summaryLevel = formData.get("summaryLevel") as string;
    const context = formData.get("context") as string;
    const prompt = formData.get("prompt") as string;
    console.log("createExplorerSlice form", formData.get("action"));
  },
  init: async () => {
    if (get().initComplete) {
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
