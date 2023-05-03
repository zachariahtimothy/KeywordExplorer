import "./Chat.css";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { ResponseErrorHandler, useOpenAiStore } from "../modules/openAi";
import { FormEventHandler, useRef } from "react";
import {
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
} from "openai";
import { AppMainNavigation } from "../modules/application";

export default function ChatPage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Chat</IonTitle>
          <AppMainNavigation />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Chat</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ChatForm />
        <ResponseErrorHandler />
        <ChatResponses />
      </IonContent>
    </IonPage>
  );
}

function ChatForm() {
  const createChatCompletion = useOpenAiStore((s) => s.createChatCompletion);
  const promptRef = useRef<HTMLIonTextareaElement>(null);
  const responses = useOpenAiStore((s) => s.chatResponses);
  const existingMessages = responses.reduce((accumulator, response) => {
    response.choices.forEach((choice) => {
      if (choice.message) {
        accumulator.push({
          role: choice.message.role,
          content: choice.message.content,
        });
      }
    });
    return accumulator;
  }, [] as CreateChatCompletionRequest["messages"]);
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const prompt = formData.get("prompt") as string;
    const messages = existingMessages.concat({ content: prompt, role: "user" });
    if (prompt) {
      createChatCompletion({
        messages,
      });
      if (promptRef.current) {
        promptRef.current.value = "";
      }
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <IonTextarea
          rows={6}
          ref={promptRef}
          name="prompt"
          label="Message"
          labelPlacement="stacked"
        />

        <IonButton type="submit">Send</IonButton>
      </form>
    </div>
  );
}

function ChatResponses() {
  const conversationMessages = useOpenAiStore((s) => s.conversationMessages);
  const reset = useOpenAiStore((s) => s.resetConversation);
  return (
    <div className="container">
      <h3>Conversation:</h3>
      <div className={"message-wrapper"}>
        {conversationMessages.map((message) => (
          <ConversationMessage key={message.content} message={message} />
        ))}
      </div>
      <IonButton onClick={() => reset()} color={"secondary"} fill="outline">
        New Converation
      </IonButton>
    </div>
  );
}

interface ConversationMessageProps {
  message: ChatCompletionRequestMessage;
}
function ConversationMessage(props: ConversationMessageProps) {
  const { message } = props;
  return (
    <div className={`message ${message.role} ion-padding`}>
      <IonText>
        <p>{message.role}</p>
      </IonText>
      <IonText>{message.content}</IonText>
    </div>
  );
}
