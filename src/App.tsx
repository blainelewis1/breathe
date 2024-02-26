import { useEffect, useState } from "react";

import { last, map, sum } from "lodash";
import { arc } from "d3-shape";
import {
  motion,
  useAnimate,
  useTransform,
  useMotionValue,
  useTime,
  animate,
  Variant,
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

function App() {
  const [sequence] = useState<Sequence[]>(() => {
    const url = new URL(window.location.href);
    const sequence = url.searchParams.get("sequence") ?? "in 4 hold 7 out 8";
    return parseSequence(sequence);
  });

  const radius = 50;
  const width = 4;

  const totalDuration = sum(map(sequence, "duration"));

  const a = arc()
    .innerRadius(radius - width)
    .outerRadius(radius);

  let cumulative = 0;

  const times = sequence.reduce(
    // @ts-expect-error i know prev is not undefined...
    (prev, s) => [...prev, (last(prev) ?? 0) + s.duration * 1000],
    [] as number[],
  );

  const values = sequence.map((s) => mappings[s.type].displayText);
  // console.log(times, values);
  const time = useTime();
  const text = useTransform(time, times, values);
  // console.log(time, text);

  // useEffect(() => {
  //   const animation = animate(text, values);

  //   return () => animation.stop();
  // }, []);

  // const count = useMotionValue(0);
  // const text = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const animation = animate(time, 100, { duration: totalDuration });

    return animation.stop;
  }, []);

  const maxScale = Math.max(...sequence.map((a) => mappings[a.type].scale));
  return (
    <div className="w-screen h-screen bg-zinc-900">
      <svg
        className="h-full w-full max-w-xl max-h-xl mx-auto"
        viewBox={`-${radius * maxScale} -${radius * maxScale} ${2 * radius * maxScale} ${2 * radius * maxScale}`}
      >
        <motion.g
          variants={
            {
              hold: {
                scale: mappings.hold.scale,
              },
              in: {
                scale: mappings.in.scale,
              },
              out: {
                scale: mappings.out.scale,
              },
            } as Record<keyof typeof mappings, Variant>
          }
          transition={{
            duration: totalDuration,
            repeat: Infinity,
            times: [
              ...sequence.reduce(
                // @ts-expect-error i know prev is not undefined...
                (prev, s) => [...prev, last(prev) + s.duration / totalDuration],
                [0],
              ),
            ],
            // ease: "linear",
          }}
          animate={{
            scale: [1.0, ...sequence.map((a) => mappings[a.type].scale)],
          }}
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
        </motion.g>
        {/* <motion.text
          // x="50%"
          // y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          alignmentBaseline="middle"
          className={`${mappings[sequence[0].type].colour} stroke-1`}
        >
         {mappings[sequence[0].type].displayText}
         {text}
        </motion.text> */}
        {/* TODO create another arc that's centered on the current location */}
      </svg>
      {/* <C /> */}
      <motion.div className="text-5xl text-yellow-300 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {text}
      </motion.div>
      {/* <motion.h1>{text}</motion.h1>; */}
    </div>
  );
}

export default App;
export function C() {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, 100, { duration: 10 });

    return animation.stop;
  }, []);

  return <motion.h1>{rounded}</motion.h1>;
}
