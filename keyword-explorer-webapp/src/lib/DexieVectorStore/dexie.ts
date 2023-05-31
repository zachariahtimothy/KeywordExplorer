import { similarity as ml_distance_similarity } from "ml-distance";
import { Embeddings } from "langchain/dist/embeddings/base";
import { Document } from "langchain/docstore";
import { VectorStore } from "langchain/vectorstores/base";
import { DexieDocument, DexieVectorDatabase, MetadataType } from "./db";
import { Collection } from "dexie";

export interface DexieVectorStoreArgs {
  similarity?: typeof ml_distance_similarity.cosine;
  collectionName?: string;
  /** Whether or not to automatically load all vectors into memory. default `false` */
  preloadVectors?: boolean;
  extraDbIndexes?: string[];
}

export class DexieVectorStore<
  Metadata extends MetadataType = MetadataType
> extends VectorStore {
  memoryVectors: DexieDocument<Metadata>[] = [];
  collectionName: string;
  db!: DexieVectorDatabase<Metadata>;
  extraDbIndexes?: string[];

  similarity: typeof ml_distance_similarity.cosine;

  constructor(
    embeddings: Embeddings,
    {
      similarity,
      collectionName,
      preloadVectors = false,
      extraDbIndexes,
      ...rest
    }: DexieVectorStoreArgs = {}
  ) {
    super(embeddings, rest);

    this.similarity = similarity ?? ml_distance_similarity.cosine;
    this.extraDbIndexes = extraDbIndexes;
    this.collectionName = ensureCollectionName(collectionName);
    this.ensureDb();
    if (preloadVectors) {
      this.db.documents
        .toArray()
        .then((docs) => {
          this.memoryVectors = docs;
        })
        .catch((error) => {
          console.error("DexieVectorStore", "Error loading vectors", error);
        });
    }
  }

  ensureDb(): DexieVectorDatabase<Metadata> {
    if (!this.db) {
      this.db = new DexieVectorDatabase(
        this.collectionName,
        this.extraDbIndexes
      );
    }
    return this.db;
  }

  async addVectors(
    vectors: number[][],
    documents: Document<Metadata>[]
  ): Promise<void> {
    if (vectors.length === 0) {
      return;
    }

    const db = this.ensureDb();
    const mappedVectors: DexieDocument<Metadata>[] = vectors.map(
      (embedding, idx) => ({
        content: documents[idx].pageContent,
        embedding,
        metadata: documents[idx].metadata,
      })
    );
    const result = await db.documents.bulkAdd(mappedVectors);
    console.log("result", result);
  }

  async addDocuments(documents: Document<Metadata>[]): Promise<void> {
    const texts = documents.map(({ pageContent }) => pageContent);
    return this.addVectors(
      await this.embeddings.embedDocuments(texts),
      documents
    );
  }

  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: Record<string, any>
  ): Promise<[Document<Metadata>, number][]> {
    const db = this.ensureDb();

    const collection = filter
      ? db.documents.where(filter)
      : db.documents.toCollection();
    const results = await collection.toArray();
    const searches = results
      .map((vector, index) => ({
        similarity: this.similarity(query, vector.embedding),
        index,
      }))
      .sort((a, b) => (a.similarity > b.similarity ? -1 : 0))
      .slice(0, k);
    const result: [Document<Metadata>, number][] = searches.map((search) => [
      new Document<Metadata>({
        metadata: results[search.index].metadata,
        pageContent: results[search.index].content,
      }),
      search.similarity,
    ]);

    console.log("similaritySearchVectorWithScore", result);
    return result;
  }
}

function ensureCollectionName(collectionName?: string) {
  if (!collectionName) {
    return `langchain-dexie-vector-${Math.random()}`;
  }
  return collectionName;
}
