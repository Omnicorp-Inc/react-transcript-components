import _ from "lodash";
import React from "react";
import HighlightHandle from "./HighlightHandle";
import MarkerLine from "./MarkerLine";
import { hideHighlightTransparentDivs } from "./utils";

function Highlight(props: {
  ranges: Range[];
  color: { highlightColor: string; caretColor: string };
  selected: boolean;
  hasHandles: boolean;
  getPanelOffset(): { x: number; y: number };
  onMouseOver(e: React.MouseEvent): void;
  onHandleMouseDown(handle: "start" | "end"): void;
}) {
  const {
    ranges,
    onHandleMouseDown,
    getPanelOffset,
    selected,
    onMouseOver,
    hasHandles,
  } = props;
  const { highlightColor, caretColor } = props.color;
  const sentenceRects: DOMRect[] = ranges.flatMap((r) =>
    Array.from(r.getClientRects())
  );
  const panelOffset = getPanelOffset();

  function onHandleMouseDownInner(handle: "start" | "end") {
    // Hide the highlight transparent divs to allow overlapped selection
    hideHighlightTransparentDivs();
    onHandleMouseDown(handle);
  }

  const startRect = _.first(sentenceRects);
  const endRect = _.last(sentenceRects);
  if (!startRect || !endRect) return null;

  return (
    <>
      {Array.from(sentenceRects).map((r, index) => (
        <MarkerLine
          key={index}
          rect={r}
          color={highlightColor}
          panelOffset={panelOffset}
          onMouseOver={onMouseOver}
        />
      ))}
      {hasHandles && (
        <HighlightHandle
          key={"handlestart"}
          side="start"
          top={startRect.y + panelOffset.y - 10}
          left={startRect.x + panelOffset.x - 12}
          selected={selected}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDownInner("start");
          }}
          onMouseOver={(e) => {
            e.stopPropagation();
            onMouseOver(e);
          }}
          color={caretColor}
        />
      )}
      {hasHandles && (
        <HighlightHandle
          key={"handleend"}
          side="end"
          top={endRect.y + panelOffset.y - 4}
          left={endRect.x + endRect.width + panelOffset.x - 8}
          selected={selected}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDownInner("end");
          }}
          onMouseOver={(e) => {
            e.stopPropagation();
            onMouseOver(e);
          }}
          color={caretColor}
        />
      )}
    </>
  );
}

export default React.memo(Highlight, (prevProps, nextProps) => {
  const pickNonFunctions = (i: any) => _.pickBy(i, _.negate(_.isFunction));
  const omitRanges = (i: any) => _.omit(i, ["ranges"]);
  const rangeEqual = (a: Range, b: Range) =>
    a.startContainer === b.startContainer &&
    a.endContainer === b.endContainer &&
    a.startOffset === b.startOffset &&
    a.endOffset === b.endOffset;

  const rangesEqual = (a: Range[], b: Range[]) => {
    if (a.length != b.length) return false;
    return _.every(a.map((value, index) => rangeEqual(value, b[index])));
  };

  const prevNonFunc = omitRanges(pickNonFunctions(prevProps));
  const nextNonFunc = omitRanges(pickNonFunctions(nextProps));

  const nonFuncAreEqual = _.isEqual(prevNonFunc, nextNonFunc);
  const rangesAreEqual = rangesEqual(prevProps.ranges, nextProps.ranges);

  return nonFuncAreEqual && rangesAreEqual;
});
