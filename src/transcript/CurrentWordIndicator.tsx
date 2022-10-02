import _ from "lodash";
import React, { useEffect, useState } from "react";

type Props = {
  currentWordPosition: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  panelRef: { current: HTMLDivElement | null };
};

function CurrentWordIndicator(props: Props) {
  const { panelRef, currentWordPosition } = props;
  const [__, setWindowWidth] = useState<number>(0); // to rerender on window resize change

  useEffect(() => {
    const onResize = _.debounce(() => setWindowWidth(window.innerWidth), 500);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!panelRef.current) return null;

  return (
    <>
      <div
        style={{
          position: "absolute",
          ...currentWordPosition,
          zIndex: 3,
          borderRadius: 5,
          pointerEvents: "none",
          transition: "0.08s",
          backdropFilter: "invert(200%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          ...currentWordPosition,
          zIndex: 2,
          // Note: the backgroundColor is the INVERSE of the actual color displayed on screen
          //       because the upper div has backdropFilter invert applied
          backgroundColor: "#d5a600",
          borderRadius: 5,
          pointerEvents: "none",
          transition: "0.08s",
        }}
      />
    </>
  );
}

export default CurrentWordIndicator;
