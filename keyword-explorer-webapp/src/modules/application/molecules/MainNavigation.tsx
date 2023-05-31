import { IonButtons, IonButton } from "@ionic/react";

export default function MainNavigation() {
  return (
    <IonButtons slot="end">
      <IonButton href="/home">Keyword Explorer</IonButton>
      <IonButton href="/context">Context Explorer</IonButton>
      <IonButton href="/chat">Chat</IonButton>
      <IonButton href="/imageeditor">Image Editor</IonButton>
    </IonButtons>
  );
}
