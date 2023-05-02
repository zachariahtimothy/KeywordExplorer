import { IonText } from "@ionic/react";
import { useOpenAiStore } from "../stores";

export default function ResponseErrorHandler() {
  const error = useOpenAiStore((x) => x.requestError);
  if (error?.response) {
    return (
      <IonText color="danger">{error.response.data.error.message}</IonText>
    );
  }
  return null;
}
