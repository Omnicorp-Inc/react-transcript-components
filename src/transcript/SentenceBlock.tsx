import _ from "lodash";
import React from "react";
import styled from "styled-components";
import { Sentence, Word } from "../types";
import { getMousePositionNodeOffset } from "./selections/utils";

type SentenceProps = {
  sentence: Sentence;
  onClick: (word: Word) => void;
};

const SentenceWrapper = styled.div`
  display: flex;
  /* relative so that mark and comment indicators can use absolute*/
  position: relative;
`;

const SentenceBullet = styled.span`
  user-select: none;
  width: 5px;
  &::selection {
    background-color: transparent;
  }
`;

const SentenceContent = styled.span`
  z-index: 2;
  pointer-events: auto;
  position: relative;
  line-height: 29px;
  word-spacing: 0.05em;
  padding-left: 15px;
  left: -5px;
  &::selection {
    background-color: transparent;
  }
`;

class SentenceBlock extends React.PureComponent<SentenceProps, {}> {
  offsetToWord: Array<Word>;

  constructor(props: SentenceProps) {
    super(props);
    this.offsetToWord = [];

    let offsetIdx = 0;
    props.sentence.words.forEach((word) => {
      // This would be more efficient with a range-tree, but I don't want to install a package :)
      _.range(offsetIdx, offsetIdx + word.text.length + 1).forEach(
        (offset) => (this.offsetToWord[offset] = word)
      );
      offsetIdx += word.text.length;
      offsetIdx += 1;
    });
  }

  render() {
    // Don't render empty sentences
    if (this.props.sentence.words.length === 0) return <></>;
    const words = this.props.sentence.words
      .map((word: Word) => word.text)
      .join(" ");
    return (
      <SentenceWrapper key={this.props.sentence.id}>
        <SentenceBullet>•&nbsp;&nbsp;</SentenceBullet>
        <SentenceContent
          onClick={(e) => {
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            let span = elements.filter(
              (e) => e.nodeName === "SPAN"
            )[0] as HTMLSpanElement;
            // Move the sentence above the transparent div of highlight (if there is one)
            if (span) span.style.zIndex = "5";

            const { offset } = getMousePositionNodeOffset(e);

            // Move the sentence under the highlight (if there is one)
            if (span) span.style.zIndex = "2";

            // Find the selected word according to the selection
            const word = this.offsetToWord[offset];
            if (word === undefined) return;

            this.props.onClick(word);
          }}
          data-sentenceid={this.props.sentence.id}
        >
          {words}
        </SentenceContent>
      </SentenceWrapper>
    );
  }
}

export default React.memo(SentenceBlock);
export const sentenceClassName = SentenceContent.toString().substr(1);
