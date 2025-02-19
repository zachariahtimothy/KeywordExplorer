import { CreateEmbeddingResponse, OpenAIApi } from "openai";
import { DataFrame } from "danfojs/dist/danfojs-browser/src/index";
import { OpenAiComs } from "./openAiComs";
import { openAi } from "../openAi/stores/main";
// import { OpenAI } from "langchain/llms/openai";
// import { loadQAStuffChain, loadQAMapReduceChain } from "langchain/chains";
// import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/docstore";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { loadQAStuffChain, loadQAMapReduceChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { dexieDb } from "../../lib/dexieDb";
// const llm = new OpenAI({
//   openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
//   // formDataCtor: CustomFormData,
// });
// const chainA = loadQAStuffChain(llm);

const vectorStore = new MemoryVectorStore(
  new OpenAIEmbeddings({ openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY })
);

const chainA = loadQAStuffChain(
  new OpenAI({ openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY })
);

const DEFAULT_EMBEDDING_MODEL = "text-embedding-ada-002";

const worker = new ComlinkWorker<typeof import("./worker")>(
  new URL("./worker", import.meta.url)
);

const pyWorker = new ComlinkWorker<typeof import("./py.worker")>(
  new URL("./py.worker.ts", import.meta.url)
);
const pyodideWorker = new ComlinkWorker<typeof import("./pyodide.worker")>(
  new URL("./pyodide.worker.ts", import.meta.url)
);

const DEFAULT_TEXT_MODEL = "text-davinci-003";
export default class OpenAiEmbeddings {
  openAiComs: OpenAiComs;
  dataFrame: DataFrame = new DataFrame();

  constructor(private openAi: OpenAIApi) {
    this.openAiComs = new OpenAiComs(this.openAi);
  }

  private async _saveParsedText(
    sourceId: number,
    text: string,
    embedding: number[]
  ): Promise<number> {
    return dexieDb.parsedText.add({
      source: sourceId,
      parsed_text: text,
      embedding: Float64Array.from(embedding),
    });
    // return this.db.run(
    //   "INSERT INTO table_parsed_text (source, parsed_text, embedding) VALUES (?, ?, ?);",
    //   [sourceId, text, embedding.join(",")],
    //   false
    // );
  }

  /**
   * Original: get_response
   * @param contextString
   * @param arg1
   */
  public async getResponse(
    contextString: string,
    {
      maxTokens = 255,
      model = DEFAULT_TEXT_MODEL,
    }: { maxTokens?: number; model?: string }
  ) {
    return this.openAiComs.getPromptResultParams({
      prompt: contextString,
      max_tokens: maxTokens,
      model,
    });
  }

  /**
   * Original: get_origins_text
   * @param originsList
   */
  public async getOriginsText(originsList: number[]) {
    const originsText = originsList.join(", ");
    const result = await dexieDb.parsedText
      .where({
        id: originsText,
      })
      .toArray();
    return result.map((x) => `${x.id}:${x.parsed_text}`);
    // const result = await this.db.query(
    //   "SELECT id, parsed_text FROM table_parsed_text WHERE id IN (?)",
    //   [originsText]
    // );
    // return result.values?.map((x) => `${x.id}:${x.parsed_text}`) || [];
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
    const r = await dexieDb.source.get({
      text_name: targetName,
      group_name: groupName,
    });
    console.log("r", r);
    let sourceId = r?.id;
    if (!r) {
      console.info(
        `No db entry for '${targetName}' '${groupName}': creating entry`
      );
      const insertResults = await dexieDb.source.add({
        text_name: targetName,
        group_name: groupName,
      });
      console.log("insertResults", insertResults);
      sourceId = insertResults as number;
    }

    // const sourceQueryResults = await this.db.query(
    //   `SELECT * FROM table_source WHERE text_name = ? AND group_name = ?;`,
    //   [targetName, groupName]
    // );

    // let sourceId = sourceQueryResults.values?.[0]?.id;
    // if (!sourceQueryResults.values?.length) {
    //   console.info(
    //     `No db entry for '${targetName}' '${groupName}': creating entry`
    //   );
    //   const insertResults = await this.db.run(
    //     "INSERT INTO table_source (text_name, group_name) VALUES (?, ?);",
    //     [targetName, groupName],
    //     false
    //   );

    //   console.log("insertResults", insertResults);
    //   sourceId = insertResults.changes?.lastId;
    // }
    if (!sourceId) {
      throw new Error(`No source id`);
    }
    console.log("Source Id", sourceId);

    const promises = dataFrame.values.map((row) => {
      const castRow = row as [string, number[]];
      return this._saveParsedText(sourceId!, castRow[0], castRow[1]);
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
    const sourceResult = await dexieDb.source.get({
      text_name: targetName,
      group_name: groupName,
    });
    // let results = await this.db.query(
    //   "SELECT * FROM table_source WHERE text_name = ? AND group_name = ?",
    //   [targetName, groupName]
    // );
    if (!sourceResult) {
      console.warn(
        `openAIEmbeddings.summaryizeRawText() Unable to find project ${targetName} ${groupName}`
      );
    }
    const projectId = sourceResult?.id;

    // const variables = [projectId];
    // if (maxLines) {
    //   variables.push(maxLines);
    // }

    // then take those summaries and recursively summarize until the target line count is reached
    const sourceTextResults = await dexieDb.getSourceTextView(
      sourceResult?.id,
      maxLines
    );
    // results = await this.db.query(
    //   `SELECT text_id, parsed_text FROM source_text_view WHERE source_id = ? AND summary_id = -1${
    //     maxLines ? " LIMIT ?;" : ";"
    //   }`,
    //   variables
    // );
    console.log("results", sourceTextResults.length);

    let count = 0;
    const numberOfLines = sourceTextResults?.length || 0;
    let summary_count = 0;
    const level = 1;
    while (count < numberOfLines) {
      const textToSummarize = this._buildTextToSummarize({
        results: sourceTextResults || [],
        rowCount: count,
        wordsToSummarize,
      });
      console.log("textToSummarize", textToSummarize);
      const summary = await this.openAiComs.getPromptResultParams({
        prompt: textToSummarize.query,
        model,
        temperature: 0,
        presence_penalty: 0.8,
        frequency_penalty: 0,
        max_tokens: maxTokens,
      });

      const rowId = await dexieDb.summaryText.add({
        source: projectId,
        level,
        summary_text: summary,
        origins: textToSummarize.origins,
      });
      // const result = await this.db.run(
      //   "INSERT INTO table_summary_text (source, level, summary_text, origins) VALUES (?, ?, ?, ?)",
      //   [projectId, level, summary, textToSummarize.origins],
      //   false
      // );
      // const rowId = result.changes?.lastId;
      summary_count += 1;
      console.log("openAIEmbeddings.summaryizeRawText()", { rowId, summary });
      const rowPromises = textToSummarize.rowList.map((row) => {
        return dexieDb.parsedText.update(row, {
          summary_id: rowId,
        });
      });
      // const rowPromises = textToSummarize.rowList.map((row) => {
      //   return this.db.run(
      //     "UPDATE table_parsed_text set summary_id = ? WHERE id = ?",
      //     [rowId, row],
      //     false
      //   );
      // });
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

  /**
   * Create a context for a question by finding the most similar context from the dataframe
   * Original: create_context
   * @param param0
   * @returns
   */
  public async createContext(
    question: string,
    dataFrame: DataFrame,
    maxLength = 400
  ) {
    // const doc = new Document({ pageContent: question });

    const questionEmbedding = await vectorStore.embeddings.embedQuery(question);
    // const docs = dataFrame.values.map((x) => x[3]);

    const docs = dataFrame.values.map((value) => {
      return new Document({ pageContent: value[1] });
    });
    // await vectorStore.addDocuments(docs);
    // // defaults to cosine
    // const releventDocs = await vectorStore.similaritySearch(question);
    // const distances = await chainA.call({
    //   input_documents: releventDocs,
    //   question,
    // });

    // const questionEmbeddings = this.openAiComs.getEmbedding(question);
    console.log("dataFrame.values", dataFrame.values);
    const result = await pyWorker.executeScript(
      pyodideWorker,
      "testMe",
      "distances_from_embeddings",
      [questionEmbedding, []]
    );
    console.log("result", result);
  }

  /**
   * Original: results_to_df
   */
  public resultsToDataframe(resultList: any[]) {
    const results = resultList.map((item) => {
      // const embedding = item.embedding;
      if (item.origins) {
      } else {
        item.origins = [item.text_id];
      }
      return item;
    });
    this.dataFrame = new DataFrame(results);
    return this.dataFrame;
  }

  private _buildTextToSummarize({
    results,
    rowCount: passedRowCount,
    wordsToSummarize,
    overlap = 2,
    wordLength = 100,
  }: {
    results: Awaited<ReturnType<typeof dexieDb.getSourceTextView>>;
    rowCount: number;
    wordsToSummarize: number;
    overlap?: number;
    wordLength?: number;
  }): TextSummary {
    let context = "";
    let origin_list: number[] = [];
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
      rowList.push(result.id!);

      if ("origins" in result) {
        origin_list = origin_list.concat(result.origins as number);
      } else {
        origin_list.push(result.id!);
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
  origins: number[];
}
