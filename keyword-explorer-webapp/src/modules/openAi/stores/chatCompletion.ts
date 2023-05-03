import { CreateChatCompletionRequest } from "openai";
import { StateCreator } from "zustand";
import { MainSlice, openAi } from "./main";

type ConversationMessage = CreateChatCompletionRequest["messages"][0] & {
  id?: string;
};
export interface ChatCompletionSlice {
  conversationMessages: ConversationMessage[];
  createChatCompletion: (
    request: Omit<CreateChatCompletionRequest, "model">
  ) => Promise<void>;
  resetConversation: () => void;
}

export const createChatCompletionSlice: StateCreator<
  MainSlice & ChatCompletionSlice,
  [],
  [],
  ChatCompletionSlice
> = (set, get) => ({
  conversationMessages: [],
  createChatCompletion: async (request) => {
    const { messages: requestMessages, stream, ...restRequest } = request;
    // Add users message in
    set({
      conversationMessages: get().conversationMessages.concat(requestMessages),
    });
    const messages = get().conversationMessages.map(
      ({ id, ...restMessage }) => restMessage
    );
    const requestData: CreateChatCompletionRequest = {
      messages,
      stream,
      ...restRequest,
      model: get().selectedModelId,
    };

    if (stream) {
      openAi.createChatCompletion(requestData, {
        onDownloadProgress(event: ProgressEvent) {
          const target = event.target as XMLHttpRequest;
          const newUpdates = target.responseText
            .replace("data: [DONE]", "")
            .trim()
            .split("data: ")
            .filter(Boolean);
          let id = "";
          const newUpdatesParsed: string[] = newUpdates.map((update) => {
            const parsed = JSON.parse(update);
            id = parsed.id;
            return parsed.choices[0].delta?.content || "";
          });
          const newUpdatesJoined = newUpdatesParsed.join("");

          const existingMessages = get().conversationMessages.map((x) => x);
          const existingMessageIndex = existingMessages.findLastIndex(
            (x) => x.role === "assistant" && x.id === id
          );

          if (existingMessageIndex !== -1) {
            existingMessages[existingMessageIndex].content = newUpdatesJoined;
            set({
              conversationMessages: existingMessages,
            });
          } else {
            set({
              conversationMessages: existingMessages.concat([
                {
                  role: "assistant",
                  content: newUpdatesJoined,
                  id,
                },
              ]),
            });
          }
        },
      });
    } else {
      const response = await openAi.createChatCompletion(requestData);

      if (response.data) {
        const newMessages: CreateChatCompletionRequest["messages"] =
          response.data.choices
            .filter((x) => x.message !== undefined)
            .map((x) => ({
              role: x.message!.role,
              content: x.message!.content,
            }));
        set({
          conversationMessages: get().conversationMessages.concat(newMessages),
        });
      }
    }
  },
  resetConversation: () => {
    set({ conversationMessages: [] });
  },
});
