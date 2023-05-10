import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import "../Home.css";
import { AppMainNavigation, AppModelSelect } from "../../modules/application";
import { FormEventHandler, useEffect, useState } from "react";
import { useOpenAiStore } from "../../modules/openAi";
import {
  explorerActions,
  useContextExplorerStore,
} from "../../modules/contextExplorer/store";
import { getDb } from "../../lib/db";

const ContextExplorerPage: React.FC = () => {
  const initContextExplorer = useContextExplorerStore((s) => s.init);

  useEffect(() => {
    initContextExplorer();
  }, [initContextExplorer]);

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
          <ExplorerForm />
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
          <div style={{ marginTop: 50 }}>
            <DatabaseExplorer />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ContextExplorerPage;

function ExplorerForm() {
  const projects = useContextExplorerStore((s) => s.projectOptions);
  const summaryLevelOptions = useContextExplorerStore(
    (s) => s.summaryLevelOptions
  );
  const onProjectSelected = useContextExplorerStore((s) => s.onProjectSelected);
  const onFormSubmit = useContextExplorerStore((s) => s.onFormSubmit);
  return (
    <form onSubmit={onFormSubmit}>
      <IonSelect label="Projects" onIonChange={onProjectSelected}>
        {projects.map((project) => (
          <IonSelectOption value={project.name} key={project.name}>
            {project.name}
          </IonSelectOption>
        ))}
      </IonSelect>
      <IonSelect label="Summary Levels">
        {summaryLevelOptions.map((item) => (
          <IonSelectOption value={item} key={item}>
            {item}
          </IonSelectOption>
        ))}
      </IonSelect>
      <IonTextarea name="context" label="Context" labelPlacement="stacked" />
      <IonTextarea name="prompt" label="Prompt" labelPlacement="stacked" />
      <IonRadioGroup name="action">
        <IonLabel>Actions</IonLabel>
        {explorerActions.map((action) => (
          <IonRadio
            key={action.value}
            labelPlacement="end"
            value={action.value}
          >
            {action.text}
          </IonRadio>
        ))}
      </IonRadioGroup>
      <fieldset>
        <legend>Automatic</legend>
        <IonButtons>
          <IonButton>Question</IonButton>
        </IonButtons>
      </fieldset>
      <IonButtons>
        <IonButton type="reset" color="dark">
          Clear
        </IonButton>
        <IonButton type="submit" color="primary" fill="outline">
          Submit
        </IonButton>
      </IonButtons>
    </form>
  );
}
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

function DatabaseExplorer() {
  const [results, setResults] = useState<any[]>([]);
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
      <IonTextarea name="query" label="Query" labelPlacement="stacked" />
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
