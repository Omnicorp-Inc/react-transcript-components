import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";

import {
  ExternalHighlight,
  ExternalParagraph,
  ExternalWord,
  Paragraph,
  Sentence,
  Speaker,
} from "../types";
import AutomaticScrollButton from "./AutomaticScrollButton";
import CurrentWordIndicator from "./CurrentWordIndicator";
import TranscriptText from "./ParagraphBlock";
import TranscriptSelection from "./selections/TranscriptSelection";
import {
  calculateActiveWordAndOffset,
  getTimestampForWord,
  getWordBoundingRect,
} from "./utils";

const TranscriptPanelDiv = styled.div`
  /* Fix for Firefox bug where padding-bottom is ignored with overflow: auto or overflow: scroll
https://stackoverflow.com/questions/29986977/firefox-ignores-padding-when-using-overflowscroll */
  &::after {
    content: "";
    height: 70px;
    display: block;
  }

  height: 100%;
  position: relative;
  overflow-y: scroll;
  background: transparent;
  /* padding-bottom: 70px; */

  scrollbar-width: thin;
  scrollbar-color: ##4d5b75 #4d5b75;

  &::-webkit-scrollbar {
    width: 7px !important;
  }
  &::-webkit-scrollbar-thumb {
    visibility: hidden;
    background: ##4d5b75;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ##4d5b75 !important;
  }
  &:hover {
    &::-webkit-scrollbar-thumb {
      visibility: visible;
    }
  }
`;

const TranscriptTextDiv = styled.div`
  font-size: 14px;
  line-height: 180%;
  color: #000000;
  max-width: 45em; /*Optimal reading width*/
  margin: auto;
  padding-top: 50px;
  padding-left: 60px;
  text-align: left;
`;

export type HighlightBounds = {
  id: string;
  startWordId: number;
  endWordId: number;
};
type Props = {
  readOnly: boolean;
  transcriptPanelHeight: string;
  transcript: ExternalParagraph[];

  videoPlaying: boolean;
  timestamp: number;
  setTimestamp(timestamp: number): void;

  highlights: ExternalHighlight[];
  createHighlight(start_word_offset: number, end_word_offset: number): void;
  updateHighlight(
    id: string,
    start_word_offset: number,
    end_word_offset: number
  ): void;

  autoScrollButtonRef?: { current: HTMLDivElement | null };
};

function TranscriptPanel(props: Props) {
  const {
    transcriptPanelHeight,
    transcript,
    videoPlaying,
    timestamp,
    setTimestamp,
    autoScrollButtonRef,
    highlights,
    createHighlight,
    updateHighlight,
    readOnly
  } = props;
  const panel = useRef<HTMLDivElement>(null);

  const [skipAutomaticScroll, setSkipAutomaticScroll] =
    useState<boolean>(false);
  const [forceAutomaticScroll, setForceAutomaticScroll] =
    useState<boolean>(false);
  const [selectedHighlightId, setSelectedHighlightId] = useState<
    string | undefined
  >();

  const [sentenceIdToNode, setSentenceIdToNode] = useState<
    Map<number, HTMLSpanElement>
  >(new Map());

  function getPanelOffset() {
    if (panel.current == null) return { x: 0, y: 0 };
    const panelRect = panel.current.getBoundingClientRect();
    return {
      y: panel.current.scrollTop - panelRect.top,
      x: panel.current.scrollLeft - panelRect.left,
    };
  }

  const speakerMap: Record<number, { speaker: Speaker; index: number }> =
    useMemo(() => {
      var counter = 0;
      const speakers = {};
      const seenSpeakerNames = new Set<string>();
      transcript.forEach((p) => {
        if (!seenSpeakerNames.has(p.speaker)) {
          seenSpeakerNames.add(p.speaker);
          speakers[counter] = {
            speaker: {
              id: counter,
              dbId: counter,
              name: p.speaker,
              primary: false,
            },
            index: counter,
          };
          counter += 1;
        }
      });
      return speakers;
    }, [transcript]);

  const internalTranscript: Paragraph[] = useMemo(() => {
    const output: Paragraph[] = [];
    let paragraphIdCounter = 0;
    let sentenceIdCounter = 0;
    let wordIdCounter = 0;

    function buildSentence(
      index: number,
      paragraphId: number,
      externalWords: ExternalWord[]
    ): Sentence {
      const words = externalWords.map((w, idx) => {
        const newWord = {
          id: wordIdCounter,
          index: idx,
          text: w.text,
          start_time: w.start_timestamp,
          end_time: w.end_timestamp,
          sentence_id: sentenceIdCounter,
        };
        wordIdCounter += 1;
        return newWord;
      });

      const newSentence = {
        id: sentenceIdCounter,
        index: index,
        words: words,
        paragraph_id: paragraphId,
      };
      sentenceIdCounter += 1;
      return newSentence;
    }

    transcript.forEach((p, idx) => {
      const sentenceWords: ExternalWord[][] = [[]];
      p.words.forEach((w) => {
        sentenceWords[sentenceWords.length - 1].push(w);
        if (
          w.text.includes(".") ||
          w.text.includes("!") ||
          w.text.includes("?")
        ) {
          sentenceWords.push([]);
        }
      });

      const speakerId: number = (() => {
        for (const data of Object.values(speakerMap)) {
          if (data.speaker.name == p.speaker) {
            return data.speaker.dbId;
          }
        }
        throw "Unable to find speaker in speaker map.";
      })();

      output.push({
        id: paragraphIdCounter,
        index: idx,
        speaker_id: speakerId,
        sentences: sentenceWords
          .filter((v) => v.length > 0)
          .map((v, idx) => buildSentence(idx, paragraphIdCounter, v)),
      });
      paragraphIdCounter += 1;
    });
    return output;
  }, [transcript]);

  const internalHighlights = useMemo(
    () =>
      highlights.map((v) => {
        // The internal word IDs we generate are actually the word offsets
        return {
          id: v.id,
          startWordId: v.start_word_offset,
          endWordId: v.end_word_offset,
        };
      }),
    [highlights]
  );

  const currentWordPosition = useMemo(() => {
    const activeWordData = calculateActiveWordAndOffset(
      internalTranscript,
      timestamp
    );
    if (!activeWordData) return undefined;

    const sentenceRef = sentenceIdToNode.get(activeWordData.word.sentence_id);
    if (!sentenceRef) return undefined;

    const rect = getWordBoundingRect(
      sentenceRef,
      activeWordData.startOffset,
      activeWordData.endOffset
    );
    if (!rect.x && !rect.y) return undefined;

    const panelOffset = getPanelOffset();
    return {
      top: rect.y + panelOffset.y - 3,
      left: rect.x + panelOffset.x - 2,
      width: rect.width + 4,
      height: rect.height + 8,
      // Not really the position, but some helpful data we need
      word: activeWordData.word,
      sentence: activeWordData.sentence,
    };
  }, [transcript, timestamp, sentenceIdToNode]);

  const scrollToCurrentWord = useCallback(() => {
    if (!panel.current || !currentWordPosition) return;
    panel.current.scrollTo({
      top: currentWordPosition.top - 50,
      behavior: "smooth",
    });
  }, [currentWordPosition]);

  const scrollToTimestamp = useCallback(
    (toTimestamp: any) => {
      const activeWordData = calculateActiveWordAndOffset(
        internalTranscript,
        toTimestamp
      );
      if (!activeWordData) return;

      const sentenceRef = sentenceIdToNode.get(activeWordData.word.sentence_id);
      if (!sentenceRef) return;

      const rect = getWordBoundingRect(
        sentenceRef,
        activeWordData.startOffset,
        activeWordData.endOffset
      );
      if (!rect.x && !rect.y) return;

      const panelOffset = getPanelOffset();

      if (!panel.current) return;
      panel.current.scrollTo({
        top: rect.y + panelOffset.y - 53,
        behavior: "smooth",
      });
    },
    [transcript, sentenceIdToNode, panel.current]
  );

  const location: any = {};
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    let toTimestamp: number | undefined;
    if (params.has("t") && params.get("t") !== "") {
      toTimestamp = parseFloat(params.get("t") ?? "");
    }

    let word: string | undefined;
    if (params.has("w") && params.get("w") !== "") {
      word = params.get("w") ?? "";
    }

    if (toTimestamp === undefined || isNaN(toTimestamp)) {
      return;
    }

    if (word) {
      const foundTimestamp = getTimestampForWord(
        internalTranscript,
        word,
        toTimestamp
      );
      if (foundTimestamp !== 0) {
        setTimestamp(foundTimestamp);
        scrollToTimestamp(foundTimestamp);
        return;
      }
    }
    setTimestamp(toTimestamp);
    scrollToTimestamp(toTimestamp);
  }, [location, scrollToTimestamp]);

  return (
    <div
      style={{
        position: "relative",
        resize: "vertical",
        width: "100%",
        height: transcriptPanelHeight,
      }}
    >
      {currentWordPosition && (
        <AutomaticScrollButton
          currentWordPosition={currentWordPosition}
          panelRef={panel}
          scrollToCurrentWord={scrollToCurrentWord}
          videoPlaying={videoPlaying}
          skipAutomaticScroll={skipAutomaticScroll}
          setSkipAutomaticScroll={setSkipAutomaticScroll}
          forceAutomaticScroll={forceAutomaticScroll}
          setForceAutomaticScroll={setForceAutomaticScroll}
          autoScrollButtonRef={autoScrollButtonRef}
        />
      )}
      <TranscriptPanelDiv
        ref={panel}
        onMouseOver={() => {
          setSelectedHighlightId(undefined);
        }}
      >
        <TranscriptSelection
          panelRef={panel}
          readOnly={readOnly}
          transcript={internalTranscript}
          getPanelOffset={getPanelOffset}
          highlightBounds={internalHighlights}
          sentenceIdToRef={sentenceIdToNode}
          selectedHighlightId={selectedHighlightId}
          setSelectedHighlightId={setSelectedHighlightId}
          createHighlight={createHighlight}
          editHighlightBounds={updateHighlight}
        />
        {currentWordPosition && (
          <CurrentWordIndicator
            currentWordPosition={currentWordPosition}
            panelRef={panel}
          />
        )}
        <TranscriptTextDiv>
          <TranscriptText
            transcript={internalTranscript}
            speakerMap={speakerMap}
            setTimestamp={props.setTimestamp}
            setSentenceIdToNode={setSentenceIdToNode}
            setSkipAutomaticScroll={setSkipAutomaticScroll}
          />
        </TranscriptTextDiv>
      </TranscriptPanelDiv>
    </div>
  );
}

export default TranscriptPanel;
