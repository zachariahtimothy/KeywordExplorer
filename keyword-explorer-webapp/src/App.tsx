import { Redirect, Route } from "react-router-dom";
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import Home from "./pages/Home";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Theme variables */
import "./theme/variables.css";
import OpenAiProvider from "./modules/openAi/providers/OpenAiProvider";
import ChatPage from "./pages/Chat";
import ImageEditorPage from "./pages/ImageEditor";
import ContextTabsPage from "./pages/ContextTabs";

setupIonicReact();

const App: React.FC = () => (
  <OpenAiProvider>
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/home" component={Home} />
          <Route exact path="/chat" component={ChatPage} />
          <Route exact path="/imageeditor" component={ImageEditorPage} />
          <Route path="/context/:tab" component={ContextTabsPage} />
          <Route exact path="/context">
            <Redirect to="/context/explorer" />
          </Route>
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  </OpenAiProvider>
);

export default App;
