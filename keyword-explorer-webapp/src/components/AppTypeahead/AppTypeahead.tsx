import {
  CheckboxCustomEvent,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useState } from "react";
import { Item } from "./types";
import type { JSX } from "@ionic/core/components";

export interface AppTypeaheadProps {
  items: Item[];
  selectedItem: string;
  title?: string;
  onSelectionCancel?: () => void;
  onSelectionChange?: (item: string) => void;
}

export default function AppTypeahead(props: AppTypeaheadProps) {
  const { items, selectedItem, title, onSelectionCancel, onSelectionChange } =
    props;
  const [filteredItems, setFilteredItems] = useState<Item[]>([...items]);
  const [workingSelectedValues, setWorkingSelectedValues] =
    useState<string>(selectedItem);

  const cancelChanges = () => {
    onSelectionCancel?.();
  };

  const confirmChanges = () => {
    onSelectionChange?.(workingSelectedValues);
  };

  /**
   * Update the rendered view with
   * the provided search query. If no
   * query is provided, all data
   * will be rendered.
   */
  const filterList = (searchQuery: string | null | undefined) => {
    /**
     * If no search query is defined,
     * return all options.
     */
    if (searchQuery === undefined || searchQuery === null) {
      setFilteredItems([...props.items]);
    } else {
      /**
       * Otherwise, normalize the search
       * query and check to see which items
       * contain the search query as a substring.
       */
      const normalizedQuery = searchQuery.toLowerCase();
      setFilteredItems(
        items.filter((item) => {
          return item.text.toLowerCase().includes(normalizedQuery);
        })
      );
    }
  };

  const searchbarInput: JSX.IonSearchbar["onIonInput"] = (ev) => {
    filterList(ev.target.value);
  };

  const onRadioChange: JSX.IonRadioGroup["onIonChange"] = (event) => {
    // const { checked, value } = ev.detail;
    setWorkingSelectedValues(event.detail.value);
    // if (checked) {
    //   setWorkingSelectedValues([...workingSelectedValues, value]);
    // } else {
    //   setWorkingSelectedValues(
    //     workingSelectedValues.filter((item) => item !== value)
    //   );
    // }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={cancelChanges}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={confirmChanges}>Done</IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar onIonInput={searchbarInput}></IonSearchbar>
        </IonToolbar>
      </IonHeader>

      <IonContent color="light" class="ion-padding">
        <IonList id="modal-list" inset={true}>
          <IonRadioGroup onIonChange={onRadioChange}>
            {filteredItems.map((item) => (
              <IonItem key={item.value}>
                <IonRadio value={item.value}>{item.text}</IonRadio>
              </IonItem>
            ))}
          </IonRadioGroup>
        </IonList>
      </IonContent>
    </>
  );
}
