import { CreateChatCompletionRequest, OpenAIApi } from "openai";
import type { AxiosError } from "axios";

async function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export class OpenAiComs {
  private chatModels = ["gpt-3.5", "gpt-4"];

  constructor(private openAi: OpenAIApi) {}

  /**
   * Original: get_chat_complete
   */
  public async getChatComplete(request: CreateChatCompletionRequest) {
    const {
      model = "gpt-3.5-turbo",
      max_tokens = 128,
      temperature = 0.4,
      top_p = 1,
      presence_penalty = 0.3,
      frequency_penalty = 0.3,
      ...restRequest
    } = request;
    let goodread = false;
    let waitcount = 0;
    const waitmax = 5;
    const timeToWait = 5;
    while (!goodread) {
      try {
        const response = await this.openAi.createChatCompletion({
          model,
          max_tokens,
          temperature,
          top_p,
          presence_penalty,
          frequency_penalty,
          ...restRequest,
        });
        goodread = true;
        return response.data.choices[0].message?.content.trim();
      } catch (error) {
        const err = error as AxiosError;
        console.error(`\nOpenAIComms.getChatComplete(): ${err.message}`);
        const sleeptime = (waitcount + 1) * timeToWait;
        console.log(
          `\twaiting ${sleeptime} seconds ${waitcount} of ${waitmax}`
        );
        waitcount += 1;
        if (waitcount > waitmax) {
          return "ERROR_MSG-ERROR_MSG-ERROR_MSG";
        }
        await sleep(sleeptime * 1000);
      }
    }
  }
  /**
   * Original: get_prompt_result_params
   */
  public async getPromptResultParams(
    request: Omit<CreateChatCompletionRequest, "messages"> & { prompt: string }
  ) {
    const { prompt, ...restProps } = request;
    if (this.chatModels.some((x) => request.model.startsWith(x))) {
      console.log(
        "OpenAICommsget_prompt_result_params(): Using Chat interface"
      );

      return this.getChatComplete({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        ...restProps,
      });
    }

    const {
      model = "text-davinci-003",
      max_tokens = 30,
      temperature = 0.4,
      top_p = 1,
      ...restRequest
    } = restProps;
    let waitcount = 0;
    const waitmax = 5;
    const timeToWait = 5;

    let goodread = false;

    while (!goodread) {
      try {
        const response = await this.openAi.createCompletion({
          prompt,
          model,
          max_tokens,
          temperature,
          top_p,
          ...restRequest,
        });
        goodread = true;
        return response.data.choices[0].text?.trim();
      } catch (error) {
        const err = error as AxiosError;
        console.log(`\nOpenAIComms.get_chat_complete(): ${err.message}`);
        const sleeptime = (waitcount + 1) * timeToWait;
        console.log(
          `\twaiting ${sleeptime} seconds ${waitcount} of ${waitmax}`
        );
        waitcount += 1;
        if (waitcount > waitmax) {
          return "ERROR_MSG-ERROR_MSG-ERROR_MSG";
        }
        await sleep(sleeptime * 1000);
      }
    }
  }
}
