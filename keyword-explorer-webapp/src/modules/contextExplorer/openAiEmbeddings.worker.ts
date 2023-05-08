import { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { CreateChatCompletionRequest, OpenAIApi } from "openai";
import type { AxiosError } from "axios";

function create_summary(context: string, wordLength = 100) {
  return `Summarize the following in approximately ${wordLength} words: ${context}\n\n---\n\nSummary (approximately ${wordLength} words):`;
}

interface TextSummary {
  query: string;
  count: number;
  rowList: number[];
  origins: string[];
}

function buildTextToSummarize(props: {
  results: any[];
  rowCount: number;
  wordsToSummarize: number;
  overlap?: number;
  wordLength?: number;
}): TextSummary {
  const {
    results,
    rowCount: passedRowCount,
    wordsToSummarize,
    overlap = 2,
    wordLength = 100,
  } = props;
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

  query = create_summary(context, wordLength);

  return {
    query,
    count: rowCount,
    rowList,
    origins: origin_list,
  };
  // d = {'query':query, 'count':row_count, 'row_list':row_list, 'origins':origin_list}
}

async function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}
// get_prompt_result_params
async function getPromptResultParams(
  openAi: OpenAIApi,
  request: Omit<CreateChatCompletionRequest, "messages"> & { prompt: string }
) {
  const {
    prompt,
    model = "text-davinci-003",
    max_tokens = 30,
    temperature = 0.4,
    top_p = 1,
    ...restProps
  } = request;
  let waitcount = 0;
  const waitmax = 5;
  const timeToWait = 5;
  const finalRequest: CreateChatCompletionRequest = {
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model,
    max_tokens,
    temperature,
    top_p,
    ...restProps,
  };
  try {
    const response = await openAi.createChatCompletion(finalRequest);
    return response.data.choices[0].message?.content.trim();
  } catch (error) {
    const err = error as AxiosError;
    console.log(`\nOpenAIComms.get_chat_complete(): ${err.message}`);
    const sleeptime = (waitcount + 1) * timeToWait;
    console.log(`\twaiting ${sleeptime} seconds ${waitcount} of ${waitmax}`);
    waitcount += 1;
    if (waitcount > waitmax) {
      return "ERROR_MSG-ERROR_MSG-ERROR_MSG";
    }
    await sleep(sleeptime * 1000);
  }
}
export async function summaryizeRawText(
  db: SQLiteDBConnection,
  openAi: OpenAIApi,
  props: {
    targetName: string;
    groupName: string;
    maxLines?: number;
    wordsToSummarize: number;
  }
) {
  const { targetName, groupName, maxLines, wordsToSummarize = 200 } = props;
  console.info(
    "openAIEmbeddings.summaryizeRawText()",
    `saving to ${targetName} ${groupName}`
  );
  let results = await db.query(
    "SELECT * FROM table_source WHERE text_name = ? AND group_name = ?",
    [groupName, targetName]
  );
  if (!results.values?.length) {
    console.error(
      "openAIEmbeddings.summaryizeRawText()",
      `Unable to find project ${targetName} ${groupName}`
    );
  }
  const projectId = results.values?.[0].id;

  // then take those summaries and recursively summarize until the target line count is reached
  results = await db.query(
    `SELECT text_id, parsed_text FROM source_text_view WHERE source_id = ? AND summary_id = -1 ${
      maxLines ? "LIMIT ?;" : ";"
    }`,
    [projectId, maxLines]
  );

  const count = 0;
  const numberOfLines = results.values?.length || 0;
  while (count < numberOfLines) {
    const { query } = buildTextToSummarize({
      results: results.values || [],
      rowCount: count,
      wordsToSummarize,
    });
    // run the query and store the result. Update the parsed text table with the summary id
  }
}
