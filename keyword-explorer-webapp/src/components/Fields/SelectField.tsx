import type { JSX } from "@ionic/core/components";
import { IonSelect, IonSelectOption } from "@ionic/react";
import {
  HtmlHTMLAttributes,
  RefAttributes,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useLocation } from "react-router";

export interface SelectFieldProps
  extends Partial<
    JSX.IonSelect &
      HtmlHTMLAttributes<HTMLIonSelectElement> &
      RefAttributes<HTMLIonSelectElement>
  > {
  options: { id: string; label: string }[];
}
export default function SelectField(props: SelectFieldProps) {
  const {
    options,
    value,
    labelPlacement = "stacked",
    name,
    onIonChange,
    ...restProps
  } = props;
  const location = useLocation();
  const search = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const hiddenRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLIonSelectElement>(null);

  useEffect(() => {
    if (hiddenRef.current) {
      hiddenRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (
      hiddenRef.current &&
      selectRef.current &&
      name &&
      search.has(name) &&
      !value
    ) {
      hiddenRef.current.value = search.get(name) as string;
      selectRef.current.value = search.get(name) as string;
    }
  }, [name, search, value]);

  return (
    <>
      <input type="hidden" ref={hiddenRef} name={name} />
      <IonSelect
        ref={selectRef}
        onIonChange={(e) => {
          console.log("on change", hiddenRef.current, e.detail);
          if (hiddenRef.current) {
            hiddenRef.current.value = e.detail.value;
          }
          onIonChange?.(e);
        }}
        labelPlacement={labelPlacement}
        {...restProps}
      >
        {options.map((item) => (
          <IonSelectOption key={item.id} value={item.id}>
            {item.label}
          </IonSelectOption>
        ))}
      </IonSelect>
    </>
  );
}
