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
import { useState } from "react";
import { useCorporaStore } from "../../modules/contextExplorer/corporaStore";

export default function ContextCorporaPage() {
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
  const onFormSubmit = useCorporaStore((s) => s.onFormSubmit);
  const loading = useCorporaStore((s) => s.loading);
  const [summaryLevel, setSummaryLevel] = useState(1);

  return (
    <form onSubmit={onFormSubmit}>
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
        <IonItem>
          <IonInput
            name="parseRegex"
            label="Parse Regex"
            labelPlacement="stacked"
            // value="[.!?()]"
            value="([.?()!])"
          />
        </IonItem>
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
