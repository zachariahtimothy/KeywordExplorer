import {
  IonButton,
  IonButtons,
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
import { FormEventHandler, useState } from "react";
import { ImagesResponse } from "openai";
import { useOpenAiStore } from "../modules/openAi";
import { useContextExplorerStore } from "../modules/contextExplorer/store";
import { getDb } from "../lib/db";

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
          <IonButtons>
            <IonButton
              onClick={async () => {
                const db = await getDb();
                await db.open();

                const result = await db.exportToJson("full");
                console.log("sql export result", result.export);
                await db.close();
              }}
            >
              Export DB
            </IonButton>
            <IonButton
              onClick={async () => {
                const db = await getDb();
                await db.open();
                const tables = await db.getTableList();
                const promises = tables.values?.map((table) => {
                  return db.query(`DELETE FROM ${table}`);
                });
                if (promises?.length) {
                  await Promise.all(promises);
                  console.log(promises.length, "tables cleared");
                } else {
                  console.log("No tables to clear");
                }
                await db.close();
              }}
            >
              Clear DB
            </IonButton>
          </IonButtons>
          <br />
          <DatabaseExplorer />
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

  const [summaryLevel, setSummaryLevel] = useState(1);

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

function DatabaseExplorer() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const query = formData.get("query") as string;
    const db = await getDb();
    await db.open();

    try {
      const r = await db.query(query);
      console.info("r", r);

      setResults(r.values || []);
    } catch (error) {
      console.error("Error running query", error);
    } finally {
      await db.close();
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit}>
      <IonTextarea name="query" />
      <IonButton type="submit" disabled={loading}>
        Execute
      </IonButton>
      <div>
        {results.map((x, i) => (
          <p key={`${i}`}>{JSON.stringify(x, null, 2)}</p>
        ))}
      </div>
    </form>
  );
}
