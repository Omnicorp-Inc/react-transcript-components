import React, { memo } from "react";
import styled from "styled-components";
import { formatSeconds } from "../utils";

function Highlighter() {
  return (
    <svg
      width="12"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0)">
        <path
          d="M8.8 10.0001H0.523267C0.268997 10.0001 0.0634766 9.7942 0.0634766 9.54036C0.0634766 9.28659 0.268997 9.08057 0.523267 9.08057H8.8C9.05427 9.08057 9.25979 9.28659 9.25979 9.54036C9.25979 9.7942 9.05427 10.0001 8.8 10.0001Z"
          fill="#232839"
        />
        <path
          d="M9.54549 1.46205L8.48648 0.403124C7.97474 -0.10912 7.1471 -0.136231 6.60404 0.33922L2.27893 4.09458C2.18244 4.17827 2.12535 4.29825 2.12081 4.42564C2.11803 4.5079 2.14421 4.58519 2.18286 4.65642L1.46459 5.90579C1.36069 6.08605 1.39109 6.31321 1.53818 6.4603L1.69916 6.62128L0.487504 7.83605C0.35599 7.96756 0.316924 8.16534 0.388153 8.33684C0.459467 8.50877 0.627268 8.6205 0.813087 8.6205H2.65233C2.75951 8.6205 2.86341 8.58286 2.94617 8.51475L3.29929 8.22141L3.48873 8.41085C3.57705 8.49959 3.69518 8.54556 3.81431 8.54556C3.89245 8.54556 3.97159 8.52578 4.04332 8.48444L5.29169 7.76667C5.35837 7.80296 5.4301 7.82831 5.50731 7.82831H5.52348C5.65078 7.82367 5.77084 7.76667 5.85453 7.6701L9.60897 3.34642C10.0848 2.80151 10.0572 1.97387 9.54549 1.46205ZM3.88975 7.51148L2.6749 6.29662C2.67439 6.29612 2.67397 6.29528 2.67347 6.29477C2.67304 6.29435 2.67212 6.29385 2.67161 6.29343L2.43713 6.05886L2.8427 5.35397L4.59506 7.10633L3.88975 7.51148Z"
          fill="#232839"
        />
      </g>
      <defs>
        <clipPath id="clip0">
          <rect width="10" height="10" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

const Container = styled.div`
  z-index: 5;
  position: absolute;
  user-select: none;
`;

const Rectangle = styled.div`
  width: 160px;
  height: 30px;
  background-color: #232839;
  box-shadow: 0px 10px 15px rgba(0, 0, 0, 0.2);
  transform: translate(-20px, 0px);
  border-radius: 5px;
  display: flex;
  align-items: center;

  font-size: 12px;
  color: #fff;
`;

const Button = styled.span`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 24px;
  width: 90px;
  margin-left: 3px;
  cursor: pointer;

  font-size: 12px;
  line-height: 212.5%;
  color: #232839;

  background: #2ef5ff;
  border-radius: 3px 0px 0px 3px;
  white-space: nowrap;
`;

const HighlightText = styled.span`
  margin-left: 7px;
`;

const TimeText = styled.span`
  font-style: normal;
  font-weight: normal;
  font-size: 12px;
  line-height: 212.5%;
  /* or 21px */
  text-align: right;
  color: #ffffff;
  overflow: hidden;
  margin-left: auto;
  margin-right: 15px;
`;

function HighlightCreator(props: {
  x: number;
  y: number;
  selectionDuration: number;
  createHighlight(): void;
}) {
  const { x, y, selectionDuration, createHighlight } = props;
  return (
    <Container style={{ top: y, left: x }}>
      <Rectangle>
        <Button
          // Listen to mouse down, since by the time click is triggered
          // this element will already have been hidden
          onMouseDown={createHighlight}
        >
          <Highlighter />
          <HighlightText>Make clip</HighlightText>
        </Button>
        <TimeText>{formatSeconds(selectionDuration)}</TimeText>
      </Rectangle>
    </Container>
  );
}

export default memo(HighlightCreator);
