import _ from "lodash";
import React from "react";
import HighlightHandle from "./HighlightHandle";

function SelectionMarker(props: {
  sentenceRects: DOMRect[];
  panelOffset: { x: number; y: number };
  showHandles: boolean;
  onHandleMouseDown(handle: "start" | "end"): void;
}) {
  const { sentenceRects, showHandles, panelOffset, onHandleMouseDown } = props;

  const firstLineRect = _.first(sentenceRects);
  const lastLineRect = _.last(sentenceRects);
  if (!firstLineRect || !lastLineRect) return null;

  return (
    <>
      {sentenceRects.map((r, idx) => (
        <div
          key={`selection-${idx}`}
          style={{
            position: "absolute",
            top: r.y + panelOffset.y - 3,
            left: r.x + panelOffset.x - 2,
            height: r.height + 9,
            width: r.width + 4,
            borderRadius: "4px",
            backgroundColor: "rgba(54, 143, 250, 0.35)",
          }}
        />
      ))}
      {showHandles && (
        <HighlightHandle
          key={"selection-start-handle"}
          side="start"
          top={firstLineRect.y + panelOffset.y - 10}
          left={firstLineRect.x + panelOffset.x - 12}
          selected={true}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown("start");
          }}
        />
      )}
      {showHandles && (
        <HighlightHandle
          key={"selection-end-handle"}
          side="end"
          top={lastLineRect.y + panelOffset.y - 4}
          left={lastLineRect.x + lastLineRect.width + panelOffset.x - 8}
          selected={true}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown("end");
          }}
        />
      )}
    </>
  );
}

export default SelectionMarker;
