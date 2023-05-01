import { ReactNode, useEffect } from "react";
import { useOpenAiStore } from "../stores";

export interface OpenAiProviderProps {
  children: ReactNode;
}
export default function OpenAiProvider(props: OpenAiProviderProps) {
  const { children } = props;
  const models = useOpenAiStore((s) => s.models);
  const fetchModels = useOpenAiStore((s) => s.init);

  useEffect(() => {
    if (!models) {
      fetchModels();
    }
  }, [fetchModels, models]);

  return <>{children}</>;
}
