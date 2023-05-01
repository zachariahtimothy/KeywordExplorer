import "./ExploreContainer.css";
import {
  IonButton,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
} from "@ionic/react";
import { useOpenAiStore } from "../modules/openAi";
import { FormEventHandler, useRef } from "react";
import { AppTypeahead } from "./AppTypeahead";

interface ContainerProps {}

const ExploreContainer: React.FC<ContainerProps> = () => {
  const createCompletion = useOpenAiStore((s) => s.createCompletion);
  const models = useOpenAiStore((x) => x.models);
  const selectedModelId = useOpenAiStore((x) => x.selectedModelId);
  const setSelectedModelId = useOpenAiStore((x) => x.setSelectedModelId);
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const prompt = formData.get("prompt") as string;
    if (prompt) {
      createCompletion({
        prompt,
      });
    }
  };
  const modalRef = useRef<HTMLIonModalElement>(null);
  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <IonItem button={true} detail={false} id="select-models">
          <IonLabel>Model</IonLabel>
          <div slot="end" id="selected-models">
            {selectedModelId}
          </div>
        </IonItem>
        <IonModal trigger="select-models" ref={modalRef}>
          <AppTypeahead
            title="Select a model"
            items={models?.map((x) => ({ text: x.id, value: x.id })) || []}
            selectedItem={selectedModelId}
            onSelectionCancel={() => modalRef.current?.dismiss()}
            onSelectionChange={(item) => {
              setSelectedModelId(item);
              modalRef.current?.dismiss();
            }}
          />
        </IonModal>
        <IonSelect
          label="Model"
          aria-label="Models"
          labelPlacement="stacked"
          value={selectedModelId}
          onIonChange={(event) => {
            setSelectedModelId(event.detail.value);
          }}
          // interface="popover"
          interfaceOptions={{
            componentProps: {
              style: {
                minWidth: 400,
              },
            },
          }}
        >
          {models?.map((model) => (
            <IonSelectOption
              key={model.id}
              value={model.id}
              aria-label={model.id}
            >
              {model.id}
            </IonSelectOption>
          ))}
        </IonSelect>
        <IonTextarea name="keywords" label="Keywords" />
        <IonTextarea name="context" label="Context" />
        <IonTextarea
          name="prompt"
          label="Prompt"
          minlength={20}
          rows={10}
          labelPlacement="stacked"
        />
        <IonButton type="submit">Run</IonButton>
      </form>
      <CompletionResponses />
      {/* <CreateEmbedding /> */}
      <ErrorHandler />
    </div>
  );
};

function CreateEmbedding() {
  const embeddings = useOpenAiStore((s) => s.embeddingResponses);
  const createEmbedding = useOpenAiStore((s) => s.createEmbedding);

  const onClick = () => {
    createEmbedding({
      input: `This is a book about how and why groups of people believe  really, really, believe  in things that do not exist. Things like COVID-19 vaccines have mind-control chips in them, that immigrants are pouring over unprotected borders, that Vladimir
      Putin
      has
      sexually
      explicit
      kompromat1
      on Donald Trump, or that global warming is a hoax. We are living in a time when the dangers of such beliefs should seem painfully obvious, but instead, we are seeing people increasingly drawn to them even when they conflict with their own self-interest.
      False beliefs resulted in the Rwandan Genocide of 1994, in which over one million people were slaughtered over the course of 100 days. The 2003 Iraq war was justified by the false belief that Saddam Hussein was hiding weapons of mass destruction. During the COVID-19 epidemic, the false belief that the vaccines were somehow more dangerous than the disease was shared by millions of people. Thousands upon thousands of these people died, slowly suffocating
      1. https://en.wikipedia.org/wiki/Kompromat `,
    });
  };
  return (
    <div style={{ marginTop: 20 }}>
      <IonButton onClick={onClick}>Create</IonButton>
    </div>
  );
}
function CompletionResponses() {
  const responses = useOpenAiStore((s) => s.completionResponses);

  if (responses.length) {
    return (
      <div
        style={{
          paddingTop: 10,
          justifySelf: "center",
          alignSelf: "flex-start",
        }}
      >
        {responses.map((resp) => (
          <div key={resp.id}>
            {resp.choices.map((choice) => (
              <div key={choice.index}>{choice.text}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return null;
}
function ErrorHandler() {
  const error = useOpenAiStore((x) => x.requestError);
  if (error?.response) {
    return (
      <IonText color="danger">{error.response.data.error.message}</IonText>
    );
  }
  return null;
}

// What was the price of rice in china 2 years ago today?

export default ExploreContainer;
