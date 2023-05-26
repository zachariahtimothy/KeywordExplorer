import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { AppMainNavigation } from "../../modules/application";
import { FormEventHandler, useEffect, useState } from "react";
import { useCorporaStore } from "../../modules/contextExplorer/corporaStore";

export default function ContextCorporaPage() {
  const init = useCorporaStore((s) => s.init);
  useEffect(() => {
    init();
  }, []);
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Corpora</IonTitle>
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
          <CorporaForm />
        </div>
      </IonContent>
    </IonPage>
  );
}

const numberOfSummaryLevels = 4;
function CorporaForm() {
  const saveDataset = useCorporaStore((s) => s.saveDataset);
  const loading = useCorporaStore((s) => s.loading);
  const [summaryLevel, setSummaryLevel] = useState(1);
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event): void => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    saveDataset({
      targetName: formData.get("targetName") as string,
      groupName: formData.get("targetGroup") as string,
      file: formData.get("file") as File,
      summaryLevel: parseInt(formData.get("summaryLevel") as string),
    }).catch((error) => {
      console.error("Error saving dataset", error);
    });
  };
  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend>Target</legend>
        <IonItem>
          <IonInput
            name="targetName"
            label="Name"
            labelPlacement="stacked"
            placeholder="Name of book: stampede"
            required
          />
        </IonItem>
        <IonItem>
          <IonInput
            name="targetGroup"
            label="Group"
            labelPlacement="stacked"
            placeholder="Chapter / Section: ch1"
            required
          />
        </IonItem>
        <IonItem>
          <input type="hidden" name="summaryLevel" value={summaryLevel} />

          <IonSelect
            label="Summary Level"
            value={summaryLevel}
            onIonChange={(event) => {
              setSummaryLevel(event.detail.value);
            }}
          >
            {Array.from({ length: numberOfSummaryLevels }, (_value, index) => (
              <IonSelectOption key={index} value={index + 1}>
                {index + 1}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
      </fieldset>
      <fieldset>
        <legend>File</legend>
        {/* <IonItem>
          <IonInput
            name="parseRegex"
            label="Parse Regex"
            labelPlacement="stacked"
            // value="[.!?()]"
            value="([.?()!])"
          />
        </IonItem> */}
        <IonItem>
          <input name="file" type="file" accept="text/*" required />
        </IonItem>
      </fieldset>
      <IonButtons style={{ marginTop: 10 }}>
        <IonButton>Test</IonButton>
        <IonButton
          type={"submit"}
          color="primary"
          fill="solid"
          disabled={loading}
        >
          Save
        </IonButton>
      </IonButtons>
    </form>
  );
}
