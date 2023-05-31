import Dexie, { Table } from "dexie";

// class ParsedTextTable {
//   id?: number;
//   source!: number;
//   summary_id?: number;
//   parsed_text!: string;
//   embedding!: Float64Array;
//   moderation?: string;
//   lastUpdated?: Date;
//   isDeleted?: boolean;
// }

interface SourceTable {
  id?: number;
  text_name: string;
  group_name: string;
  lastUpdated?: Date;
}

// interface SummaryTextTable {
//   id?: number;
//   source?: number;
//   level?: number;
//   summary_id?: number;
//   summary_text?: string;
//   embedding?: Float64Array;
//   origins: number[];
//   moderation?: string;
// }

// interface SourceTextView extends ParsedTextTable {
//   text_name: string;
//   group_name: string;
// }

// interface SummaryTextView extends SummaryTextTable {
//   text_name: string;
//   group_name: string;
// }

class GptDatabase extends Dexie {
  // public parsedText!: Table<ParsedTextTable, number>;
  // public summaryText!: Table<SummaryTextTable, number>;
  public source!: Table<SourceTable, number>;

  constructor(name?: string) {
    super(name ?? "VectorDatabase");

    this.version(2).stores({
      // parsedText: "++id,source,summary_id",
      // summaryText: "++id, level, group_name",
      source: "++id,group_name,[group_name+text_name]",
    });

    // this.parsedText.mapToClass(ParsedTextTable);
    // this.source.mapToClass(SourceTable);
  }

  // async getSourceTextView(
  //   sourceId?: number,
  //   maxLines?: number
  // ): Promise<SourceTextView[]> {
  //   if (!sourceId) {
  //     return [];
  //   }

  //   let collection = this.parsedText
  //     .where({
  //       source: sourceId,
  //     })
  //     .and((x) => {
  //       return !x.summary_id;
  //     });

  //   if (maxLines) {
  //     collection = collection.limit(maxLines);
  //   }
  //   const parsed = await collection.toArray();
  //   const source = await this.source.get(sourceId);

  //   if (!source) {
  //     throw new Error(`Source with id ${sourceId} not found`);
  //   }
  //   return parsed.map(
  //     (p): SourceTextView => ({
  //       ...p,
  //       text_name: source.text_name,
  //       group_name: source.group_name,
  //     })
  //   );
  // }

  // async getSummaryTextView(
  //   sourceId?: number,
  //   maxLines?: number
  // ): Promise<SummaryTextView[]> {
  //   if (!sourceId) {
  //     return [];
  //   }

  //   let collection = this.summaryText.where({
  //     source: sourceId,
  //     summary_id: undefined,
  //   });
  //   if (maxLines) {
  //     collection = collection.limit(maxLines);
  //   }
  //   const parsed = await collection.toArray();

  //   console.log("getSourceTextView", parsed);
  //   const source = await this.source.get(sourceId);

  //   if (!source) {
  //     throw new Error(`Source with id ${sourceId} not found`);
  //   }
  //   return parsed.map(
  //     (p): SummaryTextView => ({
  //       ...p,
  //       text_name: source.text_name,
  //       group_name: source.group_name,
  //     })
  //   );
  // }
}

export const dexieDb = new GptDatabase("gpt_summary");

dexieDb.source.hook("creating", (primaryKey, obj, transaction) => {
  obj.lastUpdated = new Date();
});
dexieDb.source.hook("updating", (mods, primKey, obj, transaction) => {
  obj.lastUpdated = new Date();
});
// setTimeout(() => {
//   dexieDb.source.toArray().then((result) => console.log("SOURCE", result));
//   dexieDb.parsedText
//     .toArray()
//     .then((result) => console.log("PARSED TEXT", result));

// }, 3000);
