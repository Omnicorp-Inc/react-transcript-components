import React from "react";
import styled from "styled-components";

const HandleDiv = styled.div<{ selected: boolean }>`
  opacity: ${(props) => (props.selected ? 1 : 0)};
  ${(props) =>
    props.selected ? "transition: opacity 200ms;" : "pointer-events:none;"}
`;

function HighlightHandleStart(props: any) {
  return (
    <svg
      {...props}
      height="32"
      viewBox="0 0 20 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="5" r="5" />
      <rect
        x="-1.5"
        y="32"
        width="3"
        height="25"
        transform="rotate(180 4.80469 31.9988)"
      />
    </svg>
  );
}

function HighlightHandleEnd(props: any) {
  return (
    <svg
      {...props}
      height="32"
      viewBox="0 0 20 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="27" r="5" />
      <rect x="8.5" width="3" height="25" />
    </svg>
  );
}

type Props = {
  side: "start" | "end";
  top: number;
  left: number;
  selected: boolean;
  onMouseDown: (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => void;
  onMouseOver?: (e: React.MouseEvent) => void;
  onMouseUp?: () => void;
  color?: string | null;
};
function HighlightHandle(props: Props) {
  const {
    side,
    top,
    left,
    selected,
    onMouseDown,
    onMouseOver,
    onMouseUp,
    color,
  } = props;
  const Handle = side === "start" ? HighlightHandleStart : HighlightHandleEnd;

  return (
    <HandleDiv selected={selected}>
      <Handle
        style={{
          cursor: "col-resize",
          position: "absolute",
          top: top,
          left: left,
          zIndex: 4,
          userSelect: "none",
          fill: color || "#00BDC9",
        }}
        onClick={() => console.log("Pogger!")}
        onMouseDown={onMouseDown}
        onMouseOver={(e: any) => (onMouseOver ? onMouseOver(e) : {})}
        onMouseUp={onMouseUp}
      />
    </HandleDiv>
  );
}

export default HighlightHandle;
