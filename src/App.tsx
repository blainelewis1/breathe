import { useState } from "react";

import { map, sum } from "lodash";
import {
  motion,
  useTransform,
  useTime,
  useMotionValueEvent,
} from "framer-motion";
import { ArrowLeftIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";

const mappings = {
  in: {
    displayText: "Inhale",
    colour: "dark:stroke-yellow-300 stroke-emerald-400",
    scale: 1.2,
  },
  out: {
    displayText: "Exhale",
    colour: "dark:stroke-orange-300 stroke-emerald-300",
    scale: 1.0,
  },
  hold: {
    displayText: "Hold",
    colour: "dark:stroke-zinc-600 stroke-zinc-200",
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
  const darkMode =
    JSON.parse(
      new URL(window.location.href).searchParams.get("dark") ?? "true",
    ) ?? true;

  const [sequence, setSequence] = useState(
    new URL(window.location.href).searchParams.get("sequence") ??
      fourSevenEight,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  let isValidSequence = true;
  try {
    parseSequence(sequence);
  } catch (e) {
    isValidSequence = false;
  }

  return (
    <div
      className={`h-screen w-screen dark:bg-zinc-900 ${darkMode ? "dark" : ""}`}
    >
      <motion.div
        className={`absolute left-1/2 -translate-x-1/2`}
        animate={{
          top: isPlaying ? "2em" : "50%",
          opacity: isPlaying ? 0.1 : 1,
        }}
      >
        <motion.div
          // layout="position"
          className="flex items-center divide-x-2 divide-emerald-200 overflow-hidden rounded bg-emerald-100 text-lg text-emerald-700 dark:divide-zinc-700 dark:bg-zinc-800 dark:text-yellow-200"
        >
          {!isPlaying ? (
            controlsOpen ? (
              <motion.input
                className="min-w-24 bg-transparent px-2 py-1 text-emerald-700 dark:text-gray-300"
                type="text"
                value={sequence}
                disabled={isPlaying}
                onChange={(e) => {
                  setSequence(e.target.value);
                }}
              />
            ) : (
              <button
                className="flex items-center self-stretch px-2 py-1 hover:bg-emerald-200 hover:dark:bg-zinc-700"
                onClick={() => setControlsOpen(true)}
              >
                <ChevronLeftIcon className="h-5 w-full" />
              </button>
            )
          ) : null}
          <button
            onClick={() => {
              setIsPlaying((a) => !a);
              setControlsOpen(false);
              const url = new URL(window.location.href);
              url.searchParams.set("sequence", sequence);
              window.history.pushState({}, "", url.toString());
            }}
            disabled={!isValidSequence && !isPlaying}
            className={`px-2 py-1 hover:bg-emerald-200 hover:dark:bg-zinc-700`}
          >
            {isPlaying ? "Stop" : "Begin"}
          </button>
        </motion.div>
      </motion.div>

      {isPlaying ? <Animation sequence={parseSequence(sequence)} /> : null}
    </div>
  );
}

const Animation: React.FC<{ sequence: Sequence[] }> = ({ sequence }) => {
  const radius = 50;
  const totalDuration = sum(map(sequence, "duration"));

  let cumulative = 0; //-Math.PI / 2;

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

  const padding = 5;

  return (
    <div className="h-full w-full">
      <motion.svg
        className="max-h-xl mx-auto h-full w-full max-w-xl"
        viewBox={`-${radius * maxScale + padding} -${radius * maxScale + padding} ${2 * (radius * maxScale + padding)} ${2 * (radius * maxScale + padding)}`}
      >
        <motion.g
          // rotate 90 degrees to make the top the start
          initial={{ rotate: -90 }}
          animate={{
            scale: filled.scale,
          }}
          transition={{ duration: filled.duration, staggerChildren: 1 }}
        >
          {sequence.map((item, index) => {
            const startAngle = cumulative;
            cumulative += (item.duration / totalDuration) * Math.PI * 2;
            const endAngle = cumulative;

            return (
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: 1,
                  transition: {
                    pathLength: {
                      type: "spring",
                      duration: 0.5,
                      // TODO: these delays don't work as well with bigger things... instead I should make it a portion of the total time I want to dedicate to delaying opening.
                      delay: index * 0.15,
                    },
                    opacity: { duration: 0.01 },
                  },
                }}
                key={index}
                d={`M ${Math.cos(startAngle) * radius} ${Math.sin(startAngle) * radius} A ${radius} ${radius} 0 ${endAngle - startAngle > Math.PI ? "1 1" : "0 1"} ${Math.cos(endAngle) * radius} ${Math.sin(endAngle) * radius}`}
                className={`stroke-[5] ${mappings[item.type].colour} fill-none`}
              />
            );
          })}
          {/* <motion.path
            style={{ rotate, originX: "0px", originY: "0px" }}
            key={"current-time"}
            d={`M ${Math.cos(0) * radius} ${Math.sin(0) * radius} A ${radius} ${radius} 0 0 1 ${Math.cos(Math.PI / 50) * radius} ${Math.sin(Math.PI / 50) * radius}`}
            // strokeLinecap={"round"}
            // strokeLinejoin={"round"}
            className={`stroke-[5] stroke-zinc-300 fill-none`}
          /> */}
          <motion.circle
            style={{ rotate, originX: "0px", originY: "0px" }}
            key={"current-time"}
            cx={Math.cos(Math.PI / 50 - 2.3 / radius) * radius}
            cy={Math.sin(Math.PI / 50 - 2.3 / radius) * radius}
            r={2.3}
            className={`fill-emerald-600 stroke-none opacity-90 dark:fill-zinc-900`}
          />
        </motion.g>

        <motion.text
          dominantBaseline="middle"
          textAnchor="middle"
          alignmentBaseline="middle"
          className={`fill-emerald-700 dark:fill-zinc-200`}
        >
          {filled.displayText}
        </motion.text>
        <motion.text
          y={15}
          dominantBaseline="middle"
          textAnchor="middle"
          alignmentBaseline="middle"
          className={`fill-emerald-700 dark:fill-zinc-200`}
          fontSize={5}
        >
          {Math.floor(Math.floor(time.get()) / (totalDuration * 1000))}
        </motion.text>
      </motion.svg>
    </div>
  );
};

export default App;
