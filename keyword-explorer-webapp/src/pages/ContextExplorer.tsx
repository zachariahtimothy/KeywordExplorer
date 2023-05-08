import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import "./Home.css";
import { AppMainNavigation, AppModelSelect } from "../modules/application";
import { openAi } from "../modules/openAi/stores/main";
import { FormEventHandler, useState } from "react";
import { ImagesResponse } from "openai";
import { useOpenAiStore } from "../modules/openAi";
import { useContextExplorerStore } from "../modules/contextExplorer/store";

const ContextExplorerPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Context Explorer</IonTitle>
          <AppMainNavigation />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Context Explorer</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div className="container">
          <ModelSelect />
          <CorporaForm />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ContextExplorerPage;

function ModelSelect() {
  const selectedModelId = useOpenAiStore((s) => s.selectedModelId);
  return (
    <>
      <IonItem button={true} detail={false} id="select-models">
        <IonLabel>Model</IonLabel>
        <div slot="end" id="selected-models">
          {selectedModelId}
        </div>
      </IonItem>
      <AppModelSelect />
    </>
  );
}

const numberOfSummaryLevels = 4;
function CorporaForm() {
  const onFormSubmit = useContextExplorerStore((s) => s.onFormSubmit);

  return (
    <form onSubmit={onFormSubmit}>
      <fieldset>
        <legend>Target</legend>
        <IonInput
          name="targetName"
          label="Name"
          labelPlacement="stacked"
          placeholder="Name of book: stampede"
          required
        />
        <IonInput
          name="targetGroup"
          label="Group"
          labelPlacement="stacked"
          placeholder="Chapter / Section: ch1"
          required
        />
        <IonSelect name="summaryLevel" label="Summary Level" value={0}>
          {Array.from({ length: numberOfSummaryLevels }, (_value, index) => (
            <IonSelectOption key={index} value={index}>
              {index + 1}
            </IonSelectOption>
          ))}
        </IonSelect>
      </fieldset>
      <IonInput
        name="parseRegex"
        label="Parse Regex"
        labelPlacement="stacked"
        // value="[.!?()]"
        value="([.?()!])"
      />

      <input name="file" type="file" accept="text/*" required />
      <IonButton>Test</IonButton>
      <IonButton type={"submit"}>Save</IonButton>
    </form>
  );
}
function GptForm() {
  const [imageUrls, setImageUrls] = useState<ImagesResponse["data"]>([]);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          console.log("form data", formData);
          const prompt = formData.get("prompt") as string;

          setLoading(true);
        }}
      >
        <IonTextarea label="Prompt" rows={5} name="prompt" />
        <IonButton type="submit" disabled={loading}>
          Create Variation
        </IonButton>
      </form>
    </>
  );
}
