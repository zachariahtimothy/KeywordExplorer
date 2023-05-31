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
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import type { JSX } from "@ionic/core/components";
import "../Home.css";
import { AppMainNavigation, AppModelSelect } from "../../modules/application";
import { FormEventHandler, useEffect } from "react";
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
          <Responses />
          <SourceFrame />
          {/* <div style={{ marginTop: 50 }}>
            <DatabaseExplorer />
          </div> */}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ContextExplorerPage;

function Responses() {
  const responses = useContextExplorerStore((s) => s.chatHistory);
  return (
    <>
      <IonText>Responses:</IonText>
      {responses.map((x, i) => (
        <div key={i}>{x.text}</div>
      ))}
    </>
  );
}

function SourceFrame() {
  const source = useContextExplorerStore((s) => s.sourcesField);

  return <IonTextarea value={source} rows={8} label={"Source"} name="source" />;
}
function ExplorerForm() {
  const history = useHistory();
  const search = new URLSearchParams(history.location.search);
  const projects = useContextExplorerStore((s) => s.projectOptions);
  const summaryLevelOptions = useContextExplorerStore(
    (s) => s.summaryLevelOptions
  );
  const onProjectSelected = useContextExplorerStore((s) => s.onProjectSelected);
  const onSummarySelected = useContextExplorerStore((s) => s.onSummarySelected);
  const onFormSubmit = useContextExplorerStore((s) => s.onFormSubmit);
  const resetForm = useContextExplorerStore((s) => s.resetForm);
  const promptText = useContextExplorerStore((s) => s.prompt);
  const contextField = useContextExplorerStore((s) => s.contextField);
  const onTextareaChange = useContextExplorerStore((s) => s.onTextareaChange);

  const handleProjectSelected: JSX.IonSelect["onIonChange"] = (event) => {
    search.set("projectId", event.detail.value);
    history.replace({
      ...history.location,
      search: search.toString(),
    });
    onProjectSelected(event.detail.value || "");
  };

  const handleSummarySelected: JSX.IonSelect["onIonChange"] = (event) => {
    search.set("summaryLevel", event.detail.value);
    history.replace({
      ...history.location,
      search: search.toString(),
    });
    onSummarySelected(event.detail.value);
  };

  const handleFormReset: FormEventHandler<HTMLFormElement> = () => {
    resetForm();
  };

  return (
    <form onSubmit={onFormSubmit} onReset={handleFormReset}>
      <IonItem>
        <SelectField
          name="projectId"
          label="Projects"
          onIonChange={handleProjectSelected}
          options={projects.map((x) => ({ id: x.name, label: x.name }))}
          value={projects.find((x) => x.name === search.get("projectId"))}
        />
      </IonItem>
      <IonItem>
        <SelectField
          name="summaryLevel"
          label="Summary Levels"
          onIonChange={handleSummarySelected}
          options={summaryLevelOptions.map((x) => ({ id: x, label: x }))}
          value={summaryLevelOptions.find(
            (x) => x === search.get("summaryLevel")
          )}
        />
      </IonItem>
      <IonItem>
        <IonTextarea
          name="context"
          label="Context"
          labelPlacement="stacked"
          value={contextField}
          rows={8}
          onIonInput={onTextareaChange}
        />
      </IonItem>
      <IonItem>
        <IonTextarea
          name="prompt"
          label="Prompt"
          labelPlacement="stacked"
          value={promptText}
          rows={6}
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
      <IonButtons className="ion-margin-top">
        <IonButton type="reset" color="dark">
          Clear
        </IonButton>
        <IonButton type="submit" color="primary" fill="outline" expand="block">
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
  const contextReady = useContextExplorerStore((s) => s.contextReady);
  const clickHandler = (type: AutomaticPromptType) => () =>
    onAutomaticButtonClick(type);

  const buttonsDisabled = !contextReady();
  return (
    <IonButtons>
      <IonButton onClick={clickHandler("question")} disabled={buttonsDisabled}>
        Question
      </IonButton>
      <IonButton onClick={clickHandler("tweet")} disabled={buttonsDisabled}>
        Tweet
      </IonButton>
      <IonButton
        onClick={clickHandler("science tweet")}
        disabled={buttonsDisabled}
      >
        Science Tweet
      </IonButton>
      <IonButton onClick={clickHandler("thread")} disabled={buttonsDisabled}>
        Thread
      </IonButton>
      <IonButton onClick={clickHandler("factoid")} disabled={buttonsDisabled}>
        Factoid
      </IonButton>
      <IonButton
        onClick={clickHandler("press release")}
        disabled={buttonsDisabled}
      >
        Press Release
      </IonButton>
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
