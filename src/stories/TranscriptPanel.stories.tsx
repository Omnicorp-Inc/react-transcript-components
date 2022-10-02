import React, {
  ComponentProps,
  useEffect,
  useRef,
  useState,
} from "react";

import _ from "lodash";
import { Story } from "@storybook/react";

import { ExternalHighlight, ExternalParagraph } from "../types";
import TranscriptPanel from "../transcript/TranscriptPanel";
import { transcript } from "./sampleTranscript";

export default {
  title: "Interview Viewer/TranscriptPanel",
  component: FakeTranscriptPanelContainer,
};

const transcriptData: ExternalParagraph[] = JSON.parse(transcript);

function FakeTranscriptPanelContainer(props: {
  isPlaying: boolean;
  playbackSpeed: number;
  initialHighlights: ExternalHighlight[];
}) {
  const { isPlaying, playbackSpeed, initialHighlights } = props;
  const playingTimerId = useRef<ReturnType<typeof setInterval>>();
  const [timestamp, setTimestamp] = useState<number>(0);
  const [highlights, setHighlights] =
    useState<ExternalHighlight[]>(initialHighlights);

  useEffect(() => {
    const incrementTimestamp = () =>
      setTimestamp((oldTimestamp) => oldTimestamp + 0.1 * playbackSpeed);

    if (isPlaying) {
      if (playingTimerId.current) clearInterval(playingTimerId.current);
      playingTimerId.current = setInterval(incrementTimestamp, 100);
    }

    if (!isPlaying && playingTimerId.current) {
      clearInterval(playingTimerId.current);
      playingTimerId.current = undefined;
    }
  }, [isPlaying, playbackSpeed]);

  return (
    <TranscriptPanel
      transcript={transcriptData}
      timestamp={timestamp}
      setTimestamp={setTimestamp}
      highlights={highlights}
      readOnly={false}
      transcriptPanelHeight={"800px"}
      createHighlight={(startWordDbId, endWordDbId) => {
        setHighlights([
          ...highlights,
          {
            id: Math.random().toString(36).substring(7),
            start_word_offset: startWordDbId,
            end_word_offset: endWordDbId,
          },
        ]);
      }}
      updateHighlight={(highlightId, startWordDbId, endWordDbId) => {
        setHighlights([
          ...highlights.filter((h) => h.id !== highlightId),
          {
            id: highlightId,
            start_word_offset: startWordDbId,
            end_word_offset: endWordDbId,
          },
        ]);
      }}
      videoPlaying={isPlaying}
    />
  );
}

const Template: Story<ComponentProps<typeof FakeTranscriptPanelContainer>> = (
  p
) => <FakeTranscriptPanelContainer {...p} />;
export const Primary = Template.bind({});
Primary.args = { isPlaying: false, playbackSpeed: 1, initialHighlights: [] };

const sampleHighlights = [
  {
    id: "pfhz8",
    start_word_offset: 0,
    end_word_offset: 28,
  },
  {
    id: "79ekdh",
    start_word_offset: 46,
    end_word_offset: 61,
  },
  {
    id: "um3vs",
    start_word_offset: 68,
    end_word_offset: 125,
  },
  {
    id: "gy03ei",
    start_word_offset: 129,
    end_word_offset: 436,
  },
  {
    id: "xwb3ih",
    start_word_offset: 303,
    end_word_offset: 492,
  },
  {
    id: "dm7fng",
    start_word_offset: 477,
    end_word_offset: 531,
  },
  {
    id: "hprdn",
    start_word_offset: 569,
    end_word_offset: 631,
  },
  {
    id: "y9wqt",
    start_word_offset: 647,
    end_word_offset: 830,
  },
  {
    id: "5fj4rc",
    start_word_offset: 860,
    end_word_offset: 911,
  },
  {
    id: "nd2z63",
    start_word_offset: 898,
    end_word_offset: 1042,
  },
  {
    id: "17q48d",
    start_word_offset: 1068,
    end_word_offset: 1113,
  },
  {
    id: "89uan",
    start_word_offset: 1144,
    end_word_offset: 1852,
  },
  {
    id: "s3r9bn",
    start_word_offset: 1871,
    end_word_offset: 1940,
  },
  {
    id: "oj6plt",
    start_word_offset: 1973,
    end_word_offset: 2527,
  },
  {
    id: "qzgm2",
    start_word_offset: 2648,
    end_word_offset: 2744,
  },
  {
    id: "7t6aba",
    start_word_offset: 2821,
    end_word_offset: 2942,
  },
  {
    id: "jbg3z",
    start_word_offset: 2807,
    end_word_offset: 2867,
  },
  {
    id: "wulb1e",
    start_word_offset: 2951,
    end_word_offset: 3041,
  },
  {
    id: "cwpf0s",
    start_word_offset: 3077,
    end_word_offset: 3152,
  },
  {
    id: "5ekcur",
    start_word_offset: 3242,
    end_word_offset: 5024,
  },
];

export const ManyHighlights = Template.bind({});
ManyHighlights.args = {
  isPlaying: false,
  playbackSpeed: 1,
  initialHighlights: sampleHighlights,
};
