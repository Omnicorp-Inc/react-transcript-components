import _ from "lodash";
import React from "react";

function MarkerLine(props: {
  rect: DOMRect;
  color: string;
  panelOffset: { x: number; y: number };
  onMouseOver(e: React.MouseEvent): void;
}) {
  const { rect, color, panelOffset, onMouseOver } = props;

  const backStyle: React.CSSProperties = {
    position: "absolute",
    top: rect.y + panelOffset.y - 5,
    left: rect.x + panelOffset.x,
    height: rect.height + 12,
    width: rect.width,
  };
  const commonStyles: React.CSSProperties = {
    position: "absolute",
    top: rect.y + panelOffset.y - 3,
    left: rect.x + panelOffset.x - 2,
    height: rect.height + 9,
    width: rect.width + 4,
    borderRadius: "4px",
  };
  // Top-div followed by bottom-div. Top div is transparent, but is above
  // the text, allowing for mouse events to reach it. Bottom div is colored
  // so it appears the highlight is underneath the text

  return (
    <>
      <div
        data-highlight
        key={rect.x + rect.y + "back"}
        onMouseOver={(e) => {
          e.stopPropagation();
          onMouseOver(e);
        }}
        onMouseDown={propagateMouseEvent}
        style={{
          ...backStyle,
          backgroundColor: "transparent",
          zIndex: 4,
          cursor: "text",
          userSelect: "none",
          display: "block",
        }}
      />
      <div
        key={rect.x + rect.y + "front"}
        style={{
          ...commonStyles,
          backgroundColor: color,
          opacity: 0.5,
          display: "block",
        }}
      />
    </>
  );
}

const MarkerLineMemo = React.memo(MarkerLine, (prevProps, nextProps) => {
  const pickNonFunctions = (i: any) => _.pickBy(i, _.negate(_.isFunction));
  return _.isEqual(pickNonFunctions(prevProps), pickNonFunctions(nextProps));
});

export default MarkerLineMemo;

function propagateMouseEvent(e: React.MouseEvent<HTMLDivElement>) {
  const cx = e.clientX;
  const cy = e.clientY;
  const elements = document.elementsFromPoint(cx, cy);
  // Select the sentence span to make the click
  let span = elements.filter(
    (e) => e.nodeName === "SPAN"
  )[0] as HTMLSpanElement;
  // Trigger the click event again
  var clickEvent = document.createEvent("MouseEvents");
  clickEvent.initMouseEvent(
    "click",
    true,
    true,
    window,
    e.detail,
    e.screenX,
    e.screenY,
    cx,
    cy,
    false,
    false,
    false,
    false,
    0,
    span
  );
  span.dispatchEvent(clickEvent);
}
