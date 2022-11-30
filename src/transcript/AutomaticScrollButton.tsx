import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { isVisibleElement } from "./utils";

const IndicatorButton = styled.div<{ showOnTop: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  ${(props) => {
    if (props.showOnTop) return "margin-top: 30px;";
    return "bottom: 8px;";
  }}
  background-color: #368ffa;
  border-radius: 6px;
  max-width: 20em;
  height: 2.3rem;
  transition: 0.5s;
  cursor: pointer;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9;

  &::before {
    content: "${(props) => (props.showOnTop ? "\\2191" : "\\2193")}";
    padding-right: 5px;
  }
`;

type Props = {
  currentWordPosition: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  panelRef: { current: HTMLDivElement | null };
  scrollToCurrentWord(): void;

  videoPlaying: boolean;
  skipAutomaticScroll: boolean;
  setSkipAutomaticScroll(skip: boolean): void;
  forceAutomaticScroll: boolean;
  setForceAutomaticScroll(force: boolean): void;

  autoScrollButtonRef: { current: HTMLDivElement | null };
};

function AutomaticScrollButton(props: Props) {
  const {
    currentWordPosition,
    scrollToCurrentWord,
    panelRef,
    videoPlaying,
    skipAutomaticScroll,
    setSkipAutomaticScroll,
    forceAutomaticScroll,
    setForceAutomaticScroll,
    autoScrollButtonRef,
  } = props;
  const [panelScrollTop, setPanelScrollTop] = useState(
    panelRef.current?.scrollTop
  );

  const lastScrollTimestamp = useRef<number>(0);
  const autoscrollTimeoutId = useRef<number | undefined>();

  const onScroll = () => setPanelScrollTop(panelRef.current?.scrollTop);
  const onWheel = (event: WheelEvent) => {
    if (event.deltaY < 0) {
      // Suspend automatic scroll
      setSkipAutomaticScroll(true);

      // Reset the countdown when there is a sequential scroll.
      const existingTimeoutId = autoscrollTimeoutId.current;
      if (existingTimeoutId) clearTimeout(existingTimeoutId);

      // Re enable automatic scroll after 2 seconds.
      autoscrollTimeoutId.current = window.setTimeout(
        () => setSkipAutomaticScroll(false),
        2000
      );
    }
  };

  useEffect(() => {
    panelRef.current?.addEventListener("wheel", onWheel);
    panelRef.current?.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      panelRef.current?.removeEventListener("wheel", onScroll);
    };
  }, []);

  if (!panelRef.current) return null;

  const { showButton, showButtonOnTop } = (() => {
    let showButtonOnTop = false;
    let showButton = false;
    if (panelScrollTop == undefined || panelRef.current == null)
      return { showButton, showButtonOnTop };

    const isCurrentWordVisible = isVisibleElement(
      {
        top: currentWordPosition.top,
        bottom: currentWordPosition.top + currentWordPosition.height,
      },
      panelScrollTop,
      panelRef.current.clientHeight,
      true
    );

    if (!isCurrentWordVisible) {
      showButton = true;
    }

    const isCurrentWordAboveVisibleArea =
      panelScrollTop > currentWordPosition.top;
    if (isCurrentWordAboveVisibleArea) {
      showButtonOnTop = true;
    }

    return { showButton, showButtonOnTop };
  })();

  // Non automatic scroll window = Panel height - 3 lines (29 * 3)
  const nonAutomaticScrollBottomLimit =
    (panelRef.current.scrollTop || 0) +
    (panelRef.current.clientHeight || 0) -
    87;

  // It makes automatic scroll when:
  // - Current scroll is behind the current word indicator. Except if the user makes scroll to read another part.
  // - Some event forces automatic scroll
  if (
    (videoPlaying &&
      // Don't trigger the `scroll` more than once every 2 seconds, in order to prevent an invocation every tick
      lastScrollTimestamp.current < Date.now() - 2000 &&
      currentWordPosition.top > nonAutomaticScrollBottomLimit &&
      !skipAutomaticScroll &&
      !showButton) ||
    forceAutomaticScroll
  ) {
    scrollToCurrentWord();
    lastScrollTimestamp.current = Date.now();
    setForceAutomaticScroll(false);
  }

  if (!showButton) return null;

  return (
    <IndicatorButton showOnTop={showButtonOnTop} onClick={scrollToCurrentWord} ref={autoScrollButtonRef}>
      Scroll to current word
    </IndicatorButton>
  );
}

export default AutomaticScrollButton;
