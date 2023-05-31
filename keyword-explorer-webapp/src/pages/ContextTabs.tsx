import {
  IonContent,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from "@ionic/react";
import { Redirect, Route } from "react-router";
import ContextExplorerPage from "./Context/Explorer";
import ContextCorporaPage from "./Context/Corpora";

export default function ContextTabsPage() {
  return (
    <IonContent>
      <IonTabs>
        <IonRouterOutlet>
          <Redirect exact path="/context" to="/context/explorer" />
          <Route exact path="/context/explorer">
            <ContextExplorerPage />
          </Route>
          <Route exact path="/context/corpora">
            <ContextCorporaPage />
          </Route>
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          <IonTabButton tab="explorer" href="/context/explorer">
            <IonLabel>Explorer</IonLabel>
          </IonTabButton>
          <IonTabButton tab="corpora" href="/context/corpora">
            <IonLabel>Corpora</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonContent>
  );
}
