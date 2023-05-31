import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import "./Home.css";
import { AppMainNavigation } from "../modules/application";
import { openAi } from "../modules/openAi/stores/main";
import { useState } from "react";
import { ImagesResponse } from "openai";

const ImageEditorPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Image Editor</IonTitle>
          <AppMainNavigation />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Image Editor</IonTitle>
          </IonToolbar>
        </IonHeader>
        <Form />
      </IonContent>
    </IonPage>
  );
};

export default ImageEditorPage;

function Form() {
  const [imageUrls, setImageUrls] = useState<ImagesResponse["data"]>([]);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          console.log("form data", formData);
          const prompt = formData.get("prompt") as string;
          const imageFile = formData.get("imageFile") as File;

          setLoading(true);
          openAi
            .createImageVariation(imageFile, 3)
            .then((response) => {
              setImageUrls(response.data.data);
            })
            .finally(() => {
              setLoading(false);
            });
          // openAi
          //   .createImageEdit(
          //     imageFile,
          //     prompt,
          //     undefined,
          //     2,
          //     undefined,
          //     undefined,
          //     undefined
          //   )
          //   .then((response) => {
          //     setImageUrls(response.data.data);
          //   });
        }}
      >
        <input
          name="imageFile"
          type="file"
          onChange={(event) => {
            if (event.target.files) {
              setImagePreview(URL.createObjectURL(event.target.files[0]));
            }
          }}
        />

        <IonTextarea label="Prompt" rows={5} name="prompt" />
        <IonButton type="submit" disabled={loading}>
          Create Variation
        </IonButton>
      </form>
      <div>
        <div style={{ display: "flex" }}>
          <p>Original</p>
          <img
            src={imagePreview}
            style={{ border: "1px dotted gray", maxHeight: 500, margin: 10 }}
          />
        </div>
        {imageUrls.map((x) => (
          <img key={x.url} src={x.url} style={{ maxHeight: 500, margin: 10 }} />
        ))}
      </div>
    </>
  );
}
