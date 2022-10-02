import _ from "lodash";
import { Sentence, Word } from "../../types";

export type SelectionParams = {
  start: {
    word: Word;
    node: Node;
    offset: number;
  };
  end: {
    word: Word;
    node: Node;
    offset: number;
  };
  highlightId?: string;
};

export function isSelectionEmpty(sel: Selection): boolean {
  return (
    sel.type === "None" || sel.anchorNode === null || sel.focusNode === null
  );
}

/**
 * Replaces the current selection with a single range described by start and end
 * @param start
 * @param end
 */
export function overwriteSelection(
  start: { node: Node; offset: number },
  end: { node: Node; offset: number }
) {
  const sel = document.getSelection();
  if (!sel) return;

  const range = new Range();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);

  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * Checks if the new position of the start has surpassed the old position of the end, and vice versa
 * @param direction -- 'start' means you're editing the beginning of the range, 'end' means editing the end
 * @param newNode -- the new Node that is about to be set
 * @param newOffset -- the new Offset that's about to be set
 * @param prevParams -- the params of the selected range, prior to editing it
 */
export function isDragReversed(
  direction: "start" | "end",
  newNode: Node,
  newOffset: number,
  prevParams: SelectionParams
) {
  if (direction === "start") {
    const positionCompare = newNode.compareDocumentPosition(
      prevParams.end.node
    );
    if (positionCompare & Node.DOCUMENT_POSITION_PRECEDING) return true;
    if (newNode == prevParams.end.node && newOffset > prevParams.end.offset)
      return true;
    return false;
  } else {
    const positionCompare = newNode.compareDocumentPosition(
      prevParams.start.node
    );
    if (positionCompare & Node.DOCUMENT_POSITION_FOLLOWING) return true;
    if (newNode == prevParams.start.node && newOffset < prevParams.start.offset)
      return true;
    return false;
  }
}

/**
 * Gets the node and offset that are directly underneath the mouse when event was fired
 * @param event
 */
export function getMousePositionNodeOffset(
  event: MouseEvent | React.MouseEvent
) {
  let range;
  let textNode: Node | undefined;
  let offset: number | undefined;

  // Only works on Firefox
  // https://developer.mozilla.org/en-US/docs/Web/API/DocumentOrShadowRoot/caretPositionFromPoint
  // @ts-ignore
  if (document.caretPositionFromPoint) {
    // @ts-ignore
    range = document.caretPositionFromPoint(event.clientX, event.clientY);
    textNode = range?.offsetNode;
    offset = range?.offset;
  }
  // Only works on Chrome (webkit)
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/caretRangeFromPoint
  // @ts-ignore
  else if (document.caretRangeFromPoint) {
    // @ts-ignore
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
    textNode = range?.startContainer;
    offset = range?.startOffset;
  } else {
    throw Error();
  }

  if (textNode === undefined || offset === undefined) throw Error();
  return { node: textNode, offset };
}

/**
 * Returns only the transcript text nodes within the input range
 * @param range -- Range object, with arbitrary start and end nodes
 */
function getTranscriptTextNodesInRange(range: Range): Node[] {
  // Filter nodes to only include transcript text nodes
  const iterator = document.createNodeIterator(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        if (!node.parentElement.dataset.sentenceid)
          return NodeFilter.FILTER_REJECT;
        if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
  const nodes = [];
  while (iterator.nextNode()) {
    nodes.push(iterator.referenceNode);
    if (iterator.referenceNode === range.endContainer) break;
  }

  return nodes;
}

/**
 * Returns a DOMRect for each line of transcript text within the range
 * @param range -- The range
 */
export function getTranscriptRectsInRange(range: Range): DOMRect[] {
  const nodes = getTranscriptTextNodesInRange(range);

  if (nodes.length === 1) {
    // If we have a single node, the start and end offsets both refer to it
    const r = new Range();
    r.setStart(nodes[0], range.startOffset);
    r.setEnd(nodes[0], range.endOffset);
    return Array.from(r.getClientRects());
  } else {
    // Otherwise, we need separate nodes for the start and end offsets
    const firstNode = _.first(nodes)!;
    const lastNode = _.last(nodes)!;
    const remainingNodes = _.slice(nodes, 1, nodes.length - 1);

    const rfirst = new Range();
    const rlast = new Range();

    rfirst.selectNode(firstNode);
    rfirst.setStart(firstNode, range.startOffset);

    rlast.selectNode(lastNode);
    rlast.setEnd(lastNode, range.endOffset);

    const remainingRanges = remainingNodes.map((n) => {
      const r = new Range();
      r.selectNode(n);
      return r;
    });

    return [rfirst, ...remainingRanges, rlast].flatMap((r) =>
      Array.from(r.getClientRects())
    );
  }
}

/**
 * Returns the nearest word and corresponding offset for the start and end of the range
 * @param range -- A Range where the startContainer and endContainer are Sentence <span> elements
 * @param sentenceIdToWords
 */
export function getRangeWordBoundaries(
  range: Range,
  sentenceIdToWords: Map<number, Word[]>
): {
  start: { word: Word; node: Node; offset: number };
  end: { word: Word; node: Node; offset: number };
} {
  function getSentenceId(node: Node): number {
    const sentenceIdStr = (node as HTMLElement)?.dataset?.sentenceid;
    if (!sentenceIdStr) throw Error();
    return parseInt(sentenceIdStr);
  }

  const transcriptTextNodes = getTranscriptTextNodesInRange(range);
  if (transcriptTextNodes.length === 0)
    throw Error("No transcript text nodes in range");

  const startSentenceId = getSentenceId(
    _.first(transcriptTextNodes)!.parentElement!
  );
  const endSentenceId = getSentenceId(
    _.last(transcriptTextNodes)!.parentElement!
  );

  const startSentenceWords = sentenceIdToWords.get(startSentenceId);
  const endSentenceWords = sentenceIdToWords.get(endSentenceId);
  if (!startSentenceWords || !endSentenceWords) throw Error();

  function findNearestWord(
    offset: number,
    sentence: Word[],
    position: "top" | "bottom"
  ) {
    // Word wrapping
    let tmpIdx = 0;
    let newOffset = 0;
    let nearestWord: Word | undefined;
    sentence.forEach((word) => {
      if (offset <= tmpIdx + word.text.length && offset >= tmpIdx) {
        if (position === "top") newOffset = tmpIdx;
        else newOffset = tmpIdx + word.text.length;
        nearestWord = word;
      }
      tmpIdx += word.text.length + 1;
    });
    if (!nearestWord) throw Error();

    return { word: nearestWord, offset: newOffset };
  }

  const rangeStartIsBottomSelection = startSentenceId > endSentenceId;

  return {
    start: {
      node: _.first(transcriptTextNodes)!,
      ...findNearestWord(
        range.startOffset,
        startSentenceWords,
        rangeStartIsBottomSelection ? "bottom" : "top"
      ),
    },
    end: {
      node: _.last(transcriptTextNodes)!,
      ...findNearestWord(
        range.endOffset,
        endSentenceWords,
        rangeStartIsBottomSelection ? "top" : "bottom"
      ),
    },
  };
}

const getWordOffset = (
  sentenceMap: Map<number, Sentence>,
  word: Word,
  pos: "start" | "end"
) => {
  const sentence = sentenceMap.get(word.sentence_id);
  const offset =
    sentence?.words
      .slice(0, word.index + (pos === "end" ? 1 : 0))
      .map((word) => word.text)
      .join(" ").length || 0;
  // If it is the selection start word and it is not the first word in the sentence
  // then it has a blank space before the word (offset + 1).
  return pos === "start" && word.index > 0 ? offset + 1 : offset;
};

export const getSelectionRanges = (
  sentenceIdToRef: Map<number, HTMLElement>,
  sentenceMap: Map<number, Sentence>,
  selection: { startWord: Word; endWord: Word } | undefined
) => {
  if (!selection) return;
  const { startWord, endWord } = selection;

  const startSentenceRef = sentenceIdToRef.get(startWord.sentence_id);
  const endSentenceRef = sentenceIdToRef.get(endWord.sentence_id);
  if (!startSentenceRef || !endSentenceRef) {
    console.log(
      `Can't draw selection, start sentence/end sentence ref not found`
    );
    return;
  }

  const startTextNode = startSentenceRef.childNodes[0];
  const endTextNode = endSentenceRef.childNodes[0];

  const startSentenceStartOffset = getWordOffset(
    sentenceMap,
    startWord,
    "start"
  );
  const endSentenceEndOffset = getWordOffset(sentenceMap, endWord, "end");

  if (startWord.sentence_id === endWord.sentence_id) {
    const sentenceRange = new Range();
    sentenceRange.setStart(startTextNode, startSentenceStartOffset);
    sentenceRange.setEnd(endTextNode, endSentenceEndOffset);
    // Use getClientRects instead of getBoundingClientRect because getBoundingClientRect will cause
    // a big rectangular shaped highlight if the sentence gets line wrapped. This big highlight
    // covers all text in the sentence, even if it is not included in the highlight, also looks ugly.
    return [sentenceRange];
  } else {
    const sentenceRanges = [];
    const startSentenceRange = new Range();
    const endSentenceRange = new Range();

    startSentenceRange.setStart(startTextNode, startSentenceStartOffset);
    startSentenceRange.setEnd(
      startTextNode,
      startSentenceRef.textContent?.length || 0
    );

    endSentenceRange.setStart(endTextNode, 0);
    endSentenceRange.setEnd(endTextNode, endSentenceEndOffset);

    sentenceRanges.push(startSentenceRange);
    _.range(startWord.sentence_id + 1, endWord.sentence_id).forEach(
      (sentence_id) => {
        const sentence = sentenceIdToRef.get(sentence_id);
        if (!sentence) return;
        const range = new Range();
        range.setStart(sentence.childNodes[0], 0);
        range.setEnd(sentence.childNodes[0], sentence.textContent?.length || 0);
        sentenceRanges.push(range);
      }
    );
    sentenceRanges.push(endSentenceRange);
    return sentenceRanges;
  }
};

const changeHighlightTransparentDivsDisplay = (display: string) => {
  const divs = document.querySelectorAll("div[data-highlight]");
  divs.forEach((div) => {
    (div as HTMLDivElement).style.display = display;
  });
};

export const hideHighlightTransparentDivs = () => {
  changeHighlightTransparentDivsDisplay("none");
};

export const showHighlightTransparentDivs = () => {
  changeHighlightTransparentDivsDisplay("block");
};
