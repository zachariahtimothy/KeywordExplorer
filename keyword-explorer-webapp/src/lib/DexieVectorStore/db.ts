import Dexie, { Table } from "dexie";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MetadataType = Record<string, any>;

export interface DexieDocument<Metadata extends MetadataType> {
  id?: number;
  content: string;
  embedding: number[];
  metadata?: Metadata;
}

export class DexieVectorDatabase<Metadata extends MetadataType> extends Dexie {
  public documents!: Table<DexieDocument<Metadata>>;

  constructor(name?: string, extraIndexes?: string[]) {
    super(name ?? "VectorDatabase");

    let documentIndexes = ["++id", "embedding"];
    if (extraIndexes?.length) {
      documentIndexes = documentIndexes.concat(extraIndexes);
    }
    this.version(1).stores({
      documents: documentIndexes.join(","),
    });
    console.info(
      "DexieVectorDatabase",
      "Indexes",
      this.documents.schema.indexes
    );
  }
}
