import React, { ReactNode, useCallback, useEffect, useMemo } from "react";

import _ from "lodash";
import styled from "styled-components";

import { Paragraph, Sentence, Speaker, Word } from "../types";
import { SpeakerColors } from "./utils";
import SentenceBlock from "./SentenceBlock";

const ParagraphWrapper = styled.div``;

const NameTimeWrapper = styled.div<{ nameSet: boolean }>`
  display: flex;
  align-items: center;
  margin-left: -40px;
  ${(props) => (props.nameSet ? "" : "position: absolute")}
`;

const TimestampDiv = styled.div`
  font-family: Roboto Mono;
  font-size: 12px;
  text-align: right;
  color: #c2c5ce;

  pointer-events: none;
  user-select: none;
  margin-right: 15px;
  &::selection {
    background-color: transparent;
  }
`;

const Name = styled.div`
  font-family: Inter;
  font-style: normal;
  font-weight: normal;
  font-size: 12px;

  padding-left: 5px;
  padding-right: 5px;

  user-select: none;
  %::selection {
    background-color: white;
  }
`;

const SentencesHolder = styled.div`
  /* Accounts for the bullet width */
  padding-left: 12px;
  padding-right: 40px;
  user-select: text !important;
  cursor: text;
`;

type ParagraphProps = {
  paragraph: Paragraph;
  speaker: Speaker;
  speakerIdx: number;

  setTimestamp(timestamp: number): void;
  setSkipAutomaticScroll(ski: boolean): void;
};

const _ParagraphBlock = (props: ParagraphProps) => {
  const {
    setTimestamp,
    setSkipAutomaticScroll,
    speaker,
    speakerIdx,
    paragraph,
  } = props;
  const onSentenceClick = useCallback((word: Word) => {
    setTimestamp(word.start_time);
    setSkipAutomaticScroll(false);
  }, []);

  const sentences: ReactNode[] = useMemo(
    () =>
      paragraph.sentences.map((sentence: Sentence) => (
        <SentenceBlock
          key={sentence.id}
          sentence={sentence}
          onClick={onSentenceClick}
        />
      )),
    [paragraph.sentences]
  );

  const firstNonemptySentence = useMemo(
    () => paragraph.sentences.find((s) => s.words.length > 0),
    [paragraph.sentences]
  );
  if (firstNonemptySentence === undefined) return <></>;

  const paragraphStartTime = firstNonemptySentence.words[0].start_time;
  const startTimeMins = Math.floor(paragraphStartTime / 60);
  const startTimeSecs = Math.floor(paragraphStartTime - startTimeMins * 60); // Integer seconds
  const startTimeStr = `${startTimeMins
    .toString()
    .padStart(2, "0")}:${startTimeSecs.toString().padStart(2, "0")}`;

  return (
    <ParagraphWrapper>
      <NameTimeWrapper
        onClick={() => onSentenceClick(firstNonemptySentence.words[0])}
        nameSet={speaker.name !== "Placeholder"}
      >
        <TimestampDiv key={"timestamp" + speaker.id}>
          {startTimeStr}
        </TimestampDiv>
        {/* Hide placeholder speaker names */}
        {speaker.name !== "Placeholder" ? (
          <Name
            style={{ color: SpeakerColors[speakerIdx % SpeakerColors.length] }}
          >
            {speaker.name}
          </Name>
        ) : null}
      </NameTimeWrapper>
      <SentencesHolder>{sentences}</SentencesHolder>
    </ParagraphWrapper>
  );
};
const ParagraphBlock = React.memo(_ParagraphBlock, (prevProps, nextProps) => {
  if (!_.isEqual(prevProps.paragraph, nextProps.paragraph)) return false;
  if (!_.isEqual(prevProps.speaker, nextProps.speaker)) return false;
  if (prevProps.speakerIdx !== nextProps.speakerIdx) return false;
  return true;
});

function TranscriptText(props: {
  transcript: Paragraph[];
  speakerMap: Record<number, { speaker: Speaker; index: number }>;
  setTimestamp(timestamp: number): void;
  setSentenceIdToNode(map: Map<number, HTMLScriptElement>): void;
  setSkipAutomaticScroll(ski: boolean): void;
}) {
  const { transcript, speakerMap, setSentenceIdToNode } = props;
  useEffect(() => {
    const m = new Map();
    const sentenceNodes = document.querySelectorAll("span[data-sentenceid]");
    sentenceNodes.forEach((v) => {
      const sentenceId = parseInt(
        (v as HTMLSpanElement).dataset.sentenceid || "-1"
      );
      if (sentenceId !== -1) m.set(sentenceId, v);
    });
    setSentenceIdToNode(m);
  }, [transcript]);

  return (
    <>
      {props.transcript.map((p) => (
        <ParagraphBlock
          key={p.id}
          paragraph={p}
          speaker={speakerMap[p.speaker_id].speaker}
          speakerIdx={speakerMap[p.speaker_id].index}
          setTimestamp={props.setTimestamp}
          setSkipAutomaticScroll={props.setSkipAutomaticScroll}
        />
      ))}
    </>
  );
}

export default TranscriptText;
