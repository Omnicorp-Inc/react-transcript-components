import { every, find, map } from "lodash";

import { Paragraph, Sentence, Word } from "../types";

export const SpeakerColors = [
  "#FF9494",
  "#809CFF",
  "#62D960",
  "#FF94FB",
  "#FFB570",
  "#89E0F3",
  "#B2B2B2",
  "#F0DC24",
  "#BE8CFF",
  "#8CEBCF",
];

export function formatSeconds(seconds: number) {
  let _minutes = Math.floor(seconds / 60);
  let _seconds = Math.floor(seconds) % 60;
  if (_minutes === 0) {
    return `${_seconds.toString()}s`;
  }
  return `${_minutes.toString()}m ${_seconds.toString().padStart(2, "0")}s`;
}

const HIGHLIGHT_COLORS: { highlightColor: string; caretColor: string }[] = [
  { highlightColor: "#2EF5FF", caretColor: "#00ABB4" },
  { highlightColor: "#2EFF82", caretColor: "#03A745" },
  { highlightColor: "#E2FF2E", caretColor: "#BCD810" },
  { highlightColor: "#FFAF65", caretColor: "#E87810" },
  { highlightColor: "#FF6A6A", caretColor: "#DB2424" },
  { highlightColor: "#C387FF", caretColor: "#882FE1" },
];

export const getHighlightColor = (
  highlightRange: { start: number; end: number },
  highlightCurrentGroupRange: { start: number; end: number },
  colorIndex: { val: number }
): { highlightColor: string; caretColor: string } => {
  const { start, end } = highlightRange;
  const { start: groupStart, end: groupEnd } = highlightCurrentGroupRange;
  // Highlights are sorted so we check them incrementally
  if (groupStart > -1 && groupEnd >= start && groupStart <= end) {
    // Overlapped highlight. Update group bounds
    if (start < groupStart) highlightCurrentGroupRange.start = start;
    if (end > groupEnd) highlightCurrentGroupRange.end = end;
  } else {
    colorIndex.val = 0; // Reset color iterator
    // Add the range
    highlightCurrentGroupRange.start = start;
    highlightCurrentGroupRange.end = end;
  }
  let color = HIGHLIGHT_COLORS[colorIndex.val]; // Get color
  colorIndex.val += colorIndex.val === 5 ? -5 : 1; // Reset color iterator
  return { highlightColor: color.highlightColor, caretColor: color.caretColor };
};

export const isVisibleElement = (
  elementPosition: { top: number; bottom: number },
  panelScrollTop: number,
  panelHeight: number,
  partiallyVisible: boolean = false
) => {
  const { top, bottom } = elementPosition;
  const panelScrollBottom = panelScrollTop + panelHeight;

  const visibleTop = partiallyVisible
    ? bottom > panelScrollTop
    : top > panelScrollTop;
  const visibleBottom = partiallyVisible
    ? top < panelScrollBottom
    : bottom < panelScrollBottom;

  return visibleTop && visibleBottom;
};

export function getWordBoundingRect(
  sentenceRef: HTMLElement,
  startOffset: number,
  endOffset: number
): DOMRect {
  const indicatorRange = new Range();
  indicatorRange.setStart(sentenceRef.childNodes[0], startOffset);
  indicatorRange.setEnd(sentenceRef.childNodes[0], endOffset);
  return indicatorRange.getBoundingClientRect();
}

export function calculateActiveWordAndOffset(
  transcript: Paragraph[],
  timestamp: number
) {
  let activeSentence: Sentence | undefined;
  let activeWord: Word | undefined;

  transcript.forEach((paragraph) => {
    paragraph.sentences.forEach((sentence: any) => {
      sentence.words.forEach((word: any) => {
        // The first word where the timestamp is greater than the word start time
        if (timestamp >= word.start_time) {
          activeSentence = sentence;
          activeWord = word;
        }
      });
    });
  });
  if (!activeSentence || !activeWord) return undefined;

  return {
    word: activeWord,
    sentence: activeSentence,
    startOffset: getWordOffset(activeWord, activeSentence, "start"),
    endOffset: getWordOffset(activeWord, activeSentence, "end"),
  };
}

export function getWordOffset(
  word: Word,
  sentence: Sentence,
  pos: "start" | "end"
): number {
  let offset =
    sentence.words
      .slice(0, word.index + (pos === "end" ? 1 : 0))
      .map((word) => word.text)
      .join(" ").length || 0;

  if (pos === "start" && offset !== 0) offset += 1;
  return offset;
}

const punctuations = [".", "?", "!", ","];

/**
 * Finds the timestamp of the word in the sentence where startTime >= sentence.start_time and startTime < sentence.end_time
 * @param transcript
 * @param word
 * @param startTime
 * @returns timestamp of the word if it is found, otherwise 0
 */
export function getTimestampForWord(
  transcript: Paragraph[],
  word: string,
  startTime: number = 0
): number {
  let timestamp = 0;

  for (let i = 0; i < transcript.length; i++) {
    const paragraph = transcript[i];
    for (let j = 0; j < paragraph.sentences.length; j++) {
      const sentence = paragraph.sentences[j];
      if (sentence.words.length < 1) {
        continue;
      }

      if (sentence.words[sentence.words.length - 1].end_time <= startTime) {
        continue;
      }

      for (let k = 0; k < sentence.words.length; k++) {
        const curWord = sentence.words[k];
        const splitWords = curWord.text.split(" "); // if edited to contain more than a single word

        const normalizedWords = map(splitWords, (w) => {
          if (every(punctuations, (c) => !w.endsWith(c))) {
            return w;
          }
          return w.slice(0, -1);
        });

        const match = find(normalizedWords, (w) => w === word);
        if (match) {
          timestamp = curWord.start_time;
          return timestamp;
        }
      }

      return timestamp;
    }
  }

  return timestamp;
}
