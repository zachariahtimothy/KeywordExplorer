import { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { CreateEmbeddingResponse, OpenAIApi } from "openai";
import { DataFrame } from "danfojs";
import { OpenAiComs } from "./openAiComs";
import { openAi } from "../openAi/stores/main";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-ada-002";

const worker = new ComlinkWorker<typeof import("./worker")>(
  new URL("./worker", import.meta.url)
);

export default class OpenAiEmbeddings {
  constructor(private db: SQLiteDBConnection, private openAi: OpenAIApi) {}

  private async _saveParsedText(
    sourceId: string,
    text: string,
    embedding: number[]
  ) {
    return this.db.run(
      "INSERT INTO table_parsed_text (source, parsed_text, embedding) VALUES (?, ?, ?);",
      [sourceId, text, embedding],
      false
    );
  }
  /**
   * Original: store_project_data
   * @param param0
   */
  public async storeProjectData({
    targetName,
    groupName,
    dataFrame,
  }: {
    targetName: string;
    groupName: string;
    dataFrame: DataFrame;
  }) {
    const sourceQueryResults = await this.db.query(
      `SELECT * FROM table_source WHERE text_name = ? AND group_name = ?;`,
      [targetName, groupName]
    );

    let sourceId = sourceQueryResults.values?.[0]?.id;
    if (!sourceQueryResults.values?.length) {
      console.info(
        `No db entry for '${targetName}' '${groupName}': creating entry`
      );
      const insertResults = await this.db.run(
        "INSERT INTO table_source (text_name, group_name) VALUES (?, ?);",
        [targetName, groupName],
        false
      );

      console.log("insertResults", insertResults);
      sourceId = insertResults.changes?.lastId;
    }
    if (!sourceId) {
      throw new Error(`No source id`);
    }
    console.log("Source Id", sourceId);

    const promises = dataFrame.values.map((row) => {
      const castRow = row as [string, number[]];
      return this._saveParsedText(sourceId, castRow[0], castRow[1]);
    });
    await Promise.all(promises);
  }

  /**
   * Original summarize_raw_text
   */
  public async summaryizeRawText({
    model,
    targetName,
    groupName,
    maxLines,
    wordsToSummarize = 200,
    maxTokens = 256,
  }: {
    model: string;
    maxTokens?: number;
    targetName: string;
    groupName: string;
    maxLines?: number;
    wordsToSummarize?: number;
  }) {
    //  take some set of lines from the parsed text table and produce summary lines in the summary text table
    console.info(
      "openAIEmbeddings.summaryizeRawText()",
      `saving to ${targetName} ${groupName}`
    );
    let results = await this.db.query(
      "SELECT * FROM table_source WHERE text_name = ? AND group_name = ?",
      [targetName, groupName]
    );
    if (!results.values?.length) {
      console.warn(
        `openAIEmbeddings.summaryizeRawText() Unable to find project ${targetName} ${groupName}`
      );
    }
    const projectId = results.values?.[0]?.id;

    const variables = [projectId];
    if (maxLines) {
      variables.push(maxLines);
    }

    // then take those summaries and recursively summarize until the target line count is reached
    results = await this.db.query(
      `SELECT text_id, parsed_text FROM source_text_view WHERE source_id = ? AND summary_id = -1${
        maxLines ? " LIMIT ?;" : ";"
      }`,
      variables
    );
    console.log("results", results.values?.length);

    let count = 0;
    const numberOfLines = results.values?.length || 0;
    let summary_count = 0;
    const openAiComs = new OpenAiComs(this.openAi);
    const level = 1;
    while (count < numberOfLines) {
      const textToSummarize = this._buildTextToSummarize({
        results: results.values || [],
        rowCount: count,
        wordsToSummarize,
      });
      const summary = await openAiComs.getPromptResultParams({
        prompt: textToSummarize.query,
        model,
        temperature: 0,
        presence_penalty: 0.8,
        frequency_penalty: 0,
        max_tokens: maxTokens,
      });
      const result = await this.db.run(
        "INSERT INTO table_summary_text (source, level, summary_text, origins) VALUES (?, ?, ?, ?)",
        [projectId, level, summary, textToSummarize.origins],
        false
      );
      const rowId = result.changes?.lastId;
      summary_count += 1;
      console.log("openAIEmbeddings.summaryizeRawText()", { rowId, summary });
      const rowPromises = textToSummarize.rowList.map((row) => {
        return this.db.run(
          "UPDATE table_parsed_text set summary_id = ? WHERE id = ?",
          [rowId, row],
          false
        );
      });
      await Promise.all(rowPromises);
      count = textToSummarize.count;
      // run the query and store the result. Update the parsed text table with the summary id
    }
    return summary_count;
  }

  public async getEmbeddings(fileLines: string[], submitSize = 10, max = -1) {
    const chunks = (await worker.chunkArray(
      fileLines,
      submitSize
    )) as string[][];

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

  private _buildTextToSummarize({
    results,
    rowCount: passedRowCount,
    wordsToSummarize,
    overlap = 2,
    wordLength = 100,
  }: {
    results: any[];
    rowCount: number;
    wordsToSummarize: number;
    overlap?: number;
    wordLength?: number;
  }): TextSummary {
    let context = "";
    let origin_list: string[] = [];
    let query = "Provide a summary of the following:\n";
    let wordCount = 0;
    const rowList: number[] = [];
    let rowCount = passedRowCount;
    if (rowCount > overlap) {
      rowCount -= overlap;
    }

    // while word_count < words_to_summarize and row_count < num_lines:
    while (wordCount < wordsToSummarize && rowCount < results.length) {
      const result = results[rowCount];
      const { parsed_text: text } = result;
      wordCount += context.split(" ").length;
      rowList.push(result["text_id"]);

      if ("origins" in result) {
        const l: string[] = JSON.parse(result["origins"]);
        origin_list = origin_list.concat(l);
      } else {
        origin_list.push(result["text_id"].toString());
      }

      context = context.concat(` ${text}.`);
      rowCount++;
    }

    query = this._createSummary(context, wordLength);

    return {
      query,
      count: rowCount,
      rowList,
      origins: origin_list,
    };
    // d = {'query':query, 'count':row_count, 'row_list':row_list, 'origins':origin_list}
  }

  private _createSummary(context: string, wordLength = 100) {
    return `Summarize the following in approximately ${wordLength} words: ${context}\n\n---\n\nSummary (approximately ${wordLength} words):`;
  }
}

interface TextSummary {
  query: string;
  count: number;
  rowList: number[];
  origins: string[];
}
