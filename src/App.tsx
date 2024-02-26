import { useState } from "react";

import { map, sum } from "lodash";
import { arc } from "d3-shape";
import {
  motion,
  useTransform,
  useTime,
  useMotionValueEvent,
} from "framer-motion";

const mappings = {
  in: {
    displayText: "Inhale",
    colour: "fill-yellow-300",
    scale: 1.2,
  },
  out: {
    displayText: "Exhale",
    colour: "fill-orange-300",
    scale: 1.0,
  },
  hold: {
    displayText: "Hold",
    colour: "fill-gray-600",
    scale: 1.2,
  },
};

type Sequence = {
  duration: number;
  type: keyof typeof mappings;
};

// TODO add repeats at some point

function parseSequence(str: string): Sequence[] {
  const tokens = str.split(" ");

  // let repeat = 1;

  // if (tokens[tokens.length - 2] === "x") {
  //   repeat = parseFloat(tokens[tokens.length - 1]);
  //   tokens.pop();
  //   tokens.pop();
  // }

  if (tokens.length % 2 !== 0) {
    throw new Error("Invalid input, requires even sequence length");
  }

  const sequence = [];
  // iterate over pairs
  for (let i = 0; i < tokens.length; i += 2) {
    const [key, value] = [tokens[i], tokens[i + 1]];

    if (!mappings[key as keyof typeof mappings]) {
      throw new Error(`Invalid input: ${key} ${value}`);
    }

    sequence.push({
      duration: parseFloat(value),
      type: key as keyof typeof mappings,
    });
  }

  // repeat the sequence repeat times.
  // const repeatedSequence = [];
  // for (let i = 0; i < repeat; i++) {
  //   repeatedSequence.push(...sequence);
  // }

  return sequence;
}

const fourSevenEight = "in 4 hold 7 out 8";

function App() {
  const [sequence, setSequence] = useState(
    new URL(window.location.href).searchParams.get("sequence") ??
      fourSevenEight,
  );
  const [isPlaying, setIsPlaying] = useState(false);

  let isValidSequence = true;
  try {
    parseSequence(sequence);
  } catch (e) {
    isValidSequence = false;
  }

  // TODO: create an input field, defaulted to the default or the url, and a begin button. On begin generate the sequence and start the animation.

  return (
    <div className="w-screen h-screen bg-zinc-900">
      <motion.div
        className={`fixed top-2 left-1/2 -translate-x-1/2 text-center text-lg`}
        animate={{ opacity: isPlaying ? 0.1 : 1 }}
      >
        <input
          type="text"
          value={sequence}
          disabled={isPlaying}
          onChange={(e) => {
            setSequence(e.target.value);
          }}
          className=" text-gray-300 rounded-l bg-zinc-800 px-2 py-1"
        />
        <button
          onClick={() => {
            setIsPlaying((a) => !a);
            const url = new URL(window.location.href);
            url.searchParams.set("sequence", sequence);
            window.history.pushState({}, "", url.toString());
          }}
          disabled={!isValidSequence && !isPlaying}
          className="text-yellow-200 bg-zinc-800 hover:bg-zinc-700 border-l-2 border-zinc-700 rounded-r px-2 py-1"
        >
          {isPlaying ? "Stop" : "Begin"}
        </button>
      </motion.div>
      {isPlaying ? <Animation sequence={parseSequence(sequence)} /> : null}
    </div>
  );
}

const Animation: React.FC<{ sequence: Sequence[] }> = ({ sequence }) => {
  const radius = 50;
  const width = 4;

  const totalDuration = sum(map(sequence, "duration"));

  const a = arc()
    .innerRadius(radius - width)
    .outerRadius(radius);

  let cumulative = 0;

  const time = useTime();
  const sequenceIndexMotionValue = useTransform(time, (t) => {
    t = t % (totalDuration * 1000);

    for (let i = 0; i < sequence.length; i++) {
      const s = sequence[i];
      if (t < s.duration * 1000) {
        return i;
      }
      t -= s.duration * 1000;
    }
    throw new Error("Should never reach here");
  });
  const [sequenceIndex, setSequenceIndex] = useState(
    sequenceIndexMotionValue.get(),
  );

  useMotionValueEvent(sequenceIndexMotionValue, "change", setSequenceIndex);

  const rotate = useTransform(time, [0, totalDuration * 1000], [0, 360], {
    clamp: false,
  });

  const filled = {
    ...sequence[sequenceIndex],
    i: sequenceIndex,
    ...mappings[sequence[sequenceIndex].type],
  };

  const maxScale = Math.max(...sequence.map((a) => mappings[a.type].scale));
  return (
    <div className="h-full w-full">
      <motion.svg
        className="h-full w-full max-w-xl max-h-xl mx-auto"
        viewBox={`-${radius * maxScale} -${radius * maxScale} ${2 * radius * maxScale} ${2 * radius * maxScale}`}
      >
        <motion.g
          animate={{ scale: filled.scale }}
          transition={{ duration: filled.duration }}
        >
          {sequence.map((item, index) => {
            const startAngle = cumulative;
            cumulative += (item.duration / totalDuration) * Math.PI * 2;
            const endAngle = cumulative;
            // @ts-expect-error d3 allows optonally setting defaults but typings don't match that.
            const d = a({
              startAngle,
              endAngle,
            });

            return (
              <path
                key={index}
                d={d}
                className={`${mappings[item.type].colour} stroke-1`}
              />
            );
          })}
          <motion.path
            key={"current-time"}
            style={{ rotate, originX: "0px", originY: "0px" }}
            // animate={{  }}
            // @ts-expect-error d3 allows optonally setting defaults but typings don't match that.
            d={a({ startAngle: 0, endAngle: (Math.PI * 2) / 100 })}
            className={`fill-gray-400 opacity-70`}
          />
        </motion.g>

        <motion.text
          // x="50%"
          // y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          alignmentBaseline="middle"
          className={`${mappings[sequence[0].type].colour} stroke-1`}
        >
          {filled.displayText}
        </motion.text>
      </motion.svg>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 text-center text-lg text-gray-300 ">
        {Math.floor(Math.floor(time.get()) / (totalDuration * 1000))}
      </div>
    </div>
  );
};

export default App;
