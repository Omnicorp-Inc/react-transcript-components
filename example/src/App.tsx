import React, {useMemo, useState} from "react";
import _ from 'lodash';
import TranscriptPanel  from "react-transcript-viewer";
import { ExternalHighlight } from "../../lib/esm/types";

import "./App.css";

function App() {
  const [transcript, setTranscript] = useState<string>("");
  const [timestamp, setTimestamp] = useState<number>(0);

  const [highlights, setHighlights] = useState<ExternalHighlight[]>([]);
  const [highlightIdCounter, setHighlightIdCounter] = useState<number>(0);

  const parsedTranscript = useMemo(() => {
    try {
      return JSON.parse(transcript)
    } catch (error) {
      return []
    }
  }, [transcript]);

  return (
    <div className="App">
      <h3>Paste your Recall.ai Transcript</h3>
      <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}/>
      <hr/>
      <TranscriptPanel
        transcript={parsedTranscript}
        timestamp={timestamp}
        setTimestamp={setTimestamp}
        highlights={highlights}
        readOnly={false}
        transcriptPanelHeight={"800px"}
        createHighlight={(start_word_offset, end_word_offset) => { 
          setHighlights([
            ...highlights, 
            {id: highlightIdCounter.toString(), start_word_offset, end_word_offset}
          ])
          setHighlightIdCounter(highlightIdCounter + 1);
        }}
        updateHighlight={(id, start_word_offset, end_word_offset) => {
          const newHighlights = _.cloneDeep(highlights);
          const target = newHighlights.find((v) => v.id == id);
          if (target) {
            target.start_word_offset = start_word_offset;
            target.end_word_offset = end_word_offset;
          }
          setHighlights(newHighlights)
        }}
        videoPlaying={false}
      />
      <hr/>
      <h3>Highlights</h3>
      <ul>
        {highlights.map((h) => {
          const deleteHighlight = () => setHighlights(highlights.filter((v) => v.id != h.id));
          return <li><span>{h.id} <button onClick={deleteHighlight}>Delete</button></span></li>
        })}
      </ul>
    </div>
  );
}

export default App;
