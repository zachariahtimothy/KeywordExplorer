import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
});

function splitTextByPunctuation(
  text: string,
  punctuationRegex = /([.?()!])/
): string[] {
  // const punctuationRegex = /([.?()!])/;
  const result: string[] = [];
  let lastIndex = 0;
  text.split("").forEach((char, index) => {
    if (punctuationRegex.test(char)) {
      const sentence = text.substring(lastIndex, index + 1).trim();
      if (sentence.length > 0) {
        result.push(sentence);
      }
      lastIndex = index + 1;
    }
  });
  const lastSentence = text.substring(lastIndex).trim();
  if (lastSentence.length > 0) {
    result.push(lastSentence);
  }
  return result;
}

export const parseFileText = (file: File, regex: RegExp) => {
  const reader = new FileReaderSync();
  const contents = reader.readAsText(file);
  return textSplitter.splitText(contents);
  // const noLineBreaks = contents.replaceAll(/[\n\r]/g, " ");
  // return splitTextByPunctuation(noLineBreaks, regex);
};

export const chunkArray = <Type>(arr: Type[], size: number): Type[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
};
