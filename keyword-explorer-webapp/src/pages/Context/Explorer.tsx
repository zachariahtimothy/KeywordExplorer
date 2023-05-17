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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import type { JSX } from "@ionic/core/components";
import "../Home.css";
import { AppMainNavigation, AppModelSelect } from "../../modules/application";
import { FormEventHandler, useEffect, useState } from "react";
import { useOpenAiStore } from "../../modules/openAi";
import {
  AutomaticPromptType,
  explorerActions,
  useContextExplorerStore,
} from "../../modules/contextExplorer/store";
import { getDb } from "../../lib/db";
import SelectField from "../../components/Fields/SelectField";
import { useHistory } from "react-router";

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
                const p = await db.getTableList();
                console.log("p", p.values);
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
          <SourceFrame />
          <div style={{ marginTop: 50 }}>
            <DatabaseExplorer />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ContextExplorerPage;

function SourceFrame() {
  const source = useContextExplorerStore((s) => s.sourcesField);

  return <IonTextarea value={source} rows={8} label={"Source"} name="source" />;
}
function ExplorerForm() {
  const history = useHistory();

  const projects = useContextExplorerStore((s) => s.projectOptions);
  const summaryLevelOptions = useContextExplorerStore(
    (s) => s.summaryLevelOptions
  );
  const onProjectSelected = useContextExplorerStore((s) => s.onProjectSelected);
  const onSummarySelected = useContextExplorerStore((s) => s.onSummarySelected);
  const onFormSubmit = useContextExplorerStore((s) => s.onFormSubmit);
  const promptText = useContextExplorerStore((s) => s.prompt);
  const contextField = useContextExplorerStore((s) => s.contextField);
  const onTextareaChange = useContextExplorerStore((s) => s.onTextareaChange);

  const handleProjectSelected: JSX.IonSelect["onIonChange"] = (event) => {
    const search = new URLSearchParams(history.location.search);
    search.set("projectId", event.detail.value);
    history.replace({
      ...history.location,
      search: search.toString(),
    });
    onProjectSelected(event.detail.value || "");
  };

  const handleSummarySelected: JSX.IonSelect["onIonChange"] = (event) => {
    const search = new URLSearchParams(history.location.search);
    search.set("summaryLevel", event.detail.value);
    history.replace({
      ...history.location,
      search: search.toString(),
    });
    onSummarySelected(event.detail.value);
  };
  return (
    <form onSubmit={onFormSubmit}>
      <SelectField
        name="projectId"
        label="Projects"
        onIonChange={handleProjectSelected}
        options={projects.map((x) => ({ id: x.name, label: x.name }))}
      />

      <SelectField
        name="summaryLevel"
        label="Summary Levels"
        onIonChange={handleSummarySelected}
        options={summaryLevelOptions.map((x) => ({ id: x, label: x }))}
      />
      <IonItem>
        <IonTextarea
          name="context"
          label="Context"
          labelPlacement="stacked"
          value={contextField}
          rows={5}
          onIonInput={onTextareaChange}
        />
      </IonItem>
      <IonItem>
        <IonTextarea
          name="prompt"
          label="Prompt"
          labelPlacement="stacked"
          value={promptText}
          rows={5}
          onIonInput={onTextareaChange}
        />
      </IonItem>
      <IonItem>
        <IonLabel slot="start">Actions</IonLabel>
        <IonRadioGroup name="action">
          {explorerActions.map((action) => (
            <IonRadio
              key={action.value}
              labelPlacement="start"
              value={action.value}
            >
              {action.text}
            </IonRadio>
          ))}
        </IonRadioGroup>
      </IonItem>
      <IonButtons>
        <IonButton type="reset" color="dark">
          Clear
        </IonButton>
        <IonButton type="submit" color="primary" fill="outline">
          Submit
        </IonButton>
      </IonButtons>

      <fieldset style={{ marginTop: 16 }}>
        <legend>Automatic</legend>
        <AutomaticButtons />
      </fieldset>
    </form>
  );
}

function AutomaticButtons() {
  const onAutomaticButtonClick = useContextExplorerStore(
    (s) => s.onAutomaticButtonClick
  );
  const clickHandler = (type: AutomaticPromptType) => () =>
    onAutomaticButtonClick(type);
  return (
    <IonButtons>
      <IonButton onClick={clickHandler("question")}>Question</IonButton>
    </IonButtons>
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
    // await db.execute("DROP VIEW source_text_view;");
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
