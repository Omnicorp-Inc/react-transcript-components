export type Word = {
  id: number;
  index: number;
  text: string;
  start_time: number;
  end_time: number;
  sentence_id: number;
};

export type Sentence = {
  id: number;
  index: number;
  words: Word[];
  paragraph_id: number;
};

export type Paragraph = {
  id: number;
  index: number;
  speaker_id: number;
  sentences: Sentence[];
};

export type ExternalParagraph = {
  words: ExternalWord[];
  speaker: string;
};

export type ExternalWord = {
  text: string;
  start_timestamp: number;
  end_timestamp: number;
};

export type ExternalHighlight = {
  id: string;
  start_word_offset: number;
  end_word_offset: number;
};

export type ProcessingStatus =
  | "UPLOADING"
  | "WAITING"
  | "CONVERTING"
  | "TRANSCRIBING"
  | "DONE";

export type Speaker = {
  id: string;
  dbId: number;
  name: string;
  primary: boolean;
};
