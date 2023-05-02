import { useRef } from "react";
import { useOpenAiStore } from "../../openAi";
import { IonModal } from "@ionic/react";
import { AppTypeahead } from "../../../components/AppTypeahead";

export default function AppModelSelect() {
  const models = useOpenAiStore((x) => x.models);
  const selectedModelId = useOpenAiStore((x) => x.selectedModelId);
  const setSelectedModelId = useOpenAiStore((x) => x.setSelectedModelId);
  const modalRef = useRef<HTMLIonModalElement>(null);

  return (
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
  );
}
