import _ from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Paragraph, Sentence, Word } from "../../types";
import { getHighlightColor } from "../utils";
import HighlightCreator from "./HighlightCreator";
import HighlightMarker from "./HighlightMarker";
import SelectionMarker from "./SelectionMarker";
import { HighlightBounds } from "../TranscriptPanel";

import {
  SelectionParams,
  isSelectionEmpty,
  overwriteSelection,
  isDragReversed,
  getMousePositionNodeOffset,
  getTranscriptRectsInRange,
  getRangeWordBoundaries,
  getSelectionRanges,
  hideHighlightTransparentDivs,
  showHighlightTransparentDivs,
} from "./utils";

type SelectionProps = {
  panelRef: React.RefObject<HTMLDivElement>;
  readOnly: boolean;
  transcript: Paragraph[];
  highlightBounds: HighlightBounds[];
  sentenceIdToRef: Map<number, HTMLElement>;
  selectedHighlightId: string | undefined;
  getPanelOffset: () => { x: number; y: number }; // this is a retrieval function so we don't get passed stale values
  setSelectedHighlightId(id: string | undefined): void;
  createHighlight(startWordDbId: number, endWordDbId: number): void;
  editHighlightBounds(
    highlightId: string,
    startWordDbId: number,
    endWordDbId: number
  ): void;
};

function TranscriptSelection(props: SelectionProps) {
  const {
    panelRef,
    readOnly,
    transcript,
    highlightBounds,
    sentenceIdToRef,
    selectedHighlightId,
    getPanelOffset,
    setSelectedHighlightId,
    createHighlight,
    editHighlightBounds,
  } = props;
  const [windowWidth, setWindowWidth] = useState<number>(0); // to rerender on window resize change
  const [selectionParams, setSelectionParams] = useState<
    SelectionParams | undefined
  >();
  const [showHighlightCreator, setShowHighlightCreator] = useState<boolean>();

  // isSelecting avoid highlight mouseMove repeats this block of code
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const isDragging = useRef<"start" | "end" | undefined>();
  const beforeDragSelectionParams = useRef<SelectionParams | undefined>();

  useEffect(() => {
    if (!selectionParams) return;

    createHighlight(selectionParams.start.word.id, selectionParams.end.word.id);
  }, [selectionParams]);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
    };
  });

  useEffect(() => {
    const onResize = _.debounce(() => setWindowWidth(window.innerWidth), 500);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { wordMap, sentenceMap, sentenceIdToWords } = useMemo(() => {
    const sentenceMap = new Map<number, Sentence>();
    const wordMap = new Map<number, Word>();
    const sentenceIdToWords = new Map<number, Word[]>();

    transcript.forEach((p) =>
      p.sentences.forEach((s) => {
        sentenceMap.set(s.id, s);
        sentenceIdToWords.set(s.id, s.words);
        s.words.forEach((w) => wordMap.set(w.id, w));
      })
    );

    return { wordMap, sentenceMap, sentenceIdToWords };
  }, [transcript]);

  const sentenceRects: DOMRect[] = (() => {
    if (selectionParams) {
      const selectionRange = new Range();
      selectionRange.setStart(
        selectionParams.start.node,
        selectionParams.start.offset
      );
      selectionRange.setEnd(
        selectionParams.end.node,
        selectionParams.end.offset
      );
      return getTranscriptRectsInRange(selectionRange);
    } else return [];
  })();

  function startEditingHighlight(
    highlight: HighlightBounds,
    editHandle: "start" | "end"
  ) {
    const startWord = wordMap.get(highlight.startWordId);
    const endWord = wordMap.get(highlight.endWordId);
    if (!startWord || !endWord) return;

    const highlightRanges = getSelectionRanges(sentenceIdToRef, sentenceMap, {
      startWord,
      endWord,
    });
    if (!highlightRanges) return;

    const startRange = _.first(highlightRanges)!;
    const endRange = _.last(highlightRanges)!;

    const highlightSelectionParams = {
      highlightId: highlight.id,
      start: {
        word: startWord,
        node: startRange.startContainer,
        offset: startRange.startOffset,
      },
      end: {
        word: endWord,
        node: endRange.endContainer,
        offset: endRange.endOffset,
      },
    };

    setSelectionParams(highlightSelectionParams);
    beforeDragSelectionParams.current = highlightSelectionParams;
    overwriteSelection(
      highlightSelectionParams.start,
      highlightSelectionParams.end
    );

    isDragging.current = editHandle;
    setIsSelecting(true);
  }

  function onHandleMouseDown(handle: "start" | "end") {
    isDragging.current = handle;
    setIsSelecting(true);
    setShowHighlightCreator(false);

    if (!selectionParams) return;

    beforeDragSelectionParams.current = selectionParams;
    overwriteSelection(selectionParams.start, selectionParams.end);

    // Hide the highlight transparent divs to allow overlapped selection
    hideHighlightTransparentDivs();
  }

  function onMouseDown(event: globalThis.MouseEvent) {
    // Only run the rest of onMouseDown when the click occurs within the panel
    let targetElement: HTMLElement | null = null;
    if (event.target instanceof HTMLElement) targetElement = event.target;
    while (targetElement !== panelRef.current) {
      if (!targetElement) return;
      else targetElement = targetElement.parentElement;
    }

    // Disable highlight selection since otherwise selecting text will also select the highlight divs. Since these divs
    // are packed into one div at the top of the page, selecting them will select all text up to the top of the page.
    setIsSelecting(true);
    setSelectionParams(undefined);
    setShowHighlightCreator(false);
    document.getSelection()?.empty();

    // Hide the highlight transparent divs to allow overlapped selection
    hideHighlightTransparentDivs();
  }

  function onMouseMove(event: globalThis.MouseEvent) {
    const sel = document.getSelection();
    if (!sel || isSelectionEmpty(sel)) return;

    if (!isSelecting) return;
    if (isDragging.current) {
      event.preventDefault();

      const prevParams = beforeDragSelectionParams.current;
      if (!prevParams) return;

      try {
        const { node, offset } = getMousePositionNodeOffset(event);
        const selRange = sel.getRangeAt(0);
        const reversed = isDragReversed(
          isDragging.current,
          node,
          offset,
          prevParams
        );

        if (reversed)
          isDragging.current = isDragging.current === "start" ? "end" : "start";
        if (isDragging.current === "start") selRange.setStart(node, offset);
        else selRange.setEnd(node, offset);
      } catch (e) {}
    }

    // On Firefox, multi-line selections result in multiple selection ranges,
    // while for Chromium browsers there is only ever one selection range
    const selRange = sel.getRangeAt(0);
    if (sel.rangeCount > 1) {
      const lastSelRange = sel.getRangeAt(sel.rangeCount - 1);
      selRange.setEnd(lastSelRange.endContainer, lastSelRange.endOffset);
    }

    try {
      const rangeWordBoundaries = getRangeWordBoundaries(
        selRange,
        sentenceIdToWords
      );
      setSelectionParams({
        ...rangeWordBoundaries,
        highlightId: selectionParams?.highlightId,
      });
    } catch (e) {}
  }

  function onMouseUp(_event: globalThis.MouseEvent) {
    if (!isSelecting) return;

    setIsSelecting(false);
    isDragging.current = undefined;

    // It is safe to reenable highlight selection after the mouse has been lifted,
    // since this means that the current highlighting motion is complete.
    showHighlightTransparentDivs();

    if (selectionParams?.highlightId) {
      editHighlightBounds(
        selectionParams.highlightId,
        selectionParams.start.word.id,
        selectionParams.end.word.id
      );
      setSelectionParams(undefined);
    } else {
      setShowHighlightCreator(true);
    }

    const sel = window.getSelection();
    if (!sel || isSelectionEmpty(sel)) {
      setShowHighlightCreator(false);
      setSelectionParams(undefined);
      return;
    }
    sel.empty();
  }

  function onKeyDown(event: globalThis.KeyboardEvent) {
    if (
      event.keyCode === 67 &&
      (event.ctrlKey || event.metaKey) /* Ctrl-c or Cmd-c */
    ) {
      let startWordId: number | undefined;
      let endWordId: number | undefined;

      // Copy selected text
      if (selectionParams) {
        startWordId = selectionParams.start.word.id;
        endWordId = selectionParams.end.word.id;
      }

      if (startWordId !== undefined && endWordId !== undefined) {
        const wordBuffer: Word[] = [];
        transcript.forEach((paragraph) =>
          paragraph.sentences.forEach((sentence) =>
            sentence.words.forEach((word) => {
              if (
                startWordId !== undefined &&
                endWordId !== undefined &&
                word.id >= startWordId &&
                word.id <= endWordId
              )
                wordBuffer.push(word);
            })
          )
        );
        const text = wordBuffer.map((word) => word.text).join(" ");
        navigator.clipboard.writeText(text);
        // toast.success('Copied!');
      }
    }
  }

  const highlightCreator = (() => {
    if (
      readOnly ||
      !selectionParams ||
      !showHighlightCreator ||
      selectionParams.highlightId
    )
      return;
    const {
      node: startNode,
      offset: startOffset,
      word: startWord,
    } = selectionParams.start;
    const {
      node: endNode,
      offset: endOffset,
      word: endWord,
    } = selectionParams.end;

    const newRange = new Range();
    newRange.setStart(startNode, startOffset);
    newRange.setEnd(endNode, endOffset);

    const bounds = newRange.getClientRects();

    const lastBounds = bounds[bounds.length - 1];
    const panelOffset = props.getPanelOffset();
    const xLocation = lastBounds.x + panelOffset.x + lastBounds.width / 2;

    return (
      <HighlightCreator
        x={xLocation}
        y={lastBounds.y + 30 + panelOffset.y}
        selectionDuration={endWord.end_time - startWord.start_time}
        createHighlight={() => {
          createHighlight(
            selectionParams.start.word.id,
            selectionParams.end.word.id
          );

          // Clear current selection and hide HighlightCreator once highlight created
          setIsSelecting(false);
          setSelectionParams(undefined);
          setShowHighlightCreator(false);
        }}
      />
    );
  })();

  let highlightCurrentGroupRange = { start: -1, end: -1 };
  let colorIndex = { val: 0 };
  const highlights: JSX.Element[] = highlightBounds
    .filter((a) => a.id !== selectionParams?.highlightId)
    .sort((a, b) => a.startWordId - b.startWordId)
    .map((highlight: HighlightBounds) => {
      const color = getHighlightColor(
        { start: highlight.startWordId, end: highlight.endWordId },
        highlightCurrentGroupRange,
        colorIndex
      );

      const startWord = wordMap.get(highlight.startWordId);
      const endWord = wordMap.get(highlight.endWordId);
      if (!startWord || !endWord) return <></>;

      const sentenceRanges = getSelectionRanges(sentenceIdToRef, sentenceMap, {
        startWord,
        endWord,
      });
      if (!sentenceRanges) return <></>;

      return (
        <HighlightMarker
          // Add windowWidth to the key, so the element is redrawn on the DOM when the window width changes
          key={highlight.id + windowWidth}
          ranges={sentenceRanges}
          color={color}
          selected={selectedHighlightId === highlight.id}
          hasHandles={!readOnly}
          getPanelOffset={getPanelOffset}
          onMouseOver={_.partial(setSelectedHighlightId, highlight.id)}
          onHandleMouseDown={_.partial(startEditingHighlight, highlight)}
        />
      );
    });

  return (
    <div>
      <SelectionMarker
        sentenceRects={sentenceRects}
        panelOffset={getPanelOffset()}
        showHandles={!isSelecting}
        onHandleMouseDown={onHandleMouseDown}
      />
      {highlightCreator}
      {highlights}
    </div>
  );
}
export default TranscriptSelection;
