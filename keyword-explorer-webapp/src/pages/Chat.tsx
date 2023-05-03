import "./Chat.css";
import {
  IonButton,
  IonCheckbox,
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
  const responses = useOpenAiStore((s) => s.conversationMessages);
  console.log("responses", responses);
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const prompt = formData.get("prompt") as string;
    const stream = Boolean(formData.get("stream"));
    const messages = responses.concat({ content: prompt, role: "user" });
    if (prompt) {
      createChatCompletion({
        stream,
        messages: [{ content: prompt, role: "user" }],
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
        <div>
          <IonCheckbox name="stream" checked>
            Stream?
          </IonCheckbox>
        </div>
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
