/**
 * Each pattern gets a colour so it stays visually recognisable between the
 * list and its detail page. The colour is derived from the pattern's number,
 * not stored — P1 is amber, P2 blue, P3 red, P4 green, P5 amber again, and so
 * on around the cycle.
 */

import { patternNumber } from "@/lib/db/patterns";

/** The four colours patterns cycle through, in order. */
const COLOR_CYCLE = ["amber", "blue", "red", "green"] as const;

export type PatternColor = (typeof COLOR_CYCLE)[number];

/** Tailwind classes for one colour, in each place a pattern is rendered. */
export interface PatternColorClasses {
  /** The small "P14" id chip. */
  badge: string;
  /** The card / panel outline. */
  border: string;
  /** The quoted core belief on a list card. */
  belief: string;
  /** The pattern title on its detail page. */
  title: string;
}

const CLASSES: Record<PatternColor, PatternColorClasses> = {
  amber: {
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    border: "border-amber-400/15",
    belief: "text-amber-400/60",
    title: "text-amber-400",
  },
  blue: {
    badge: "bg-mist-400/10 text-mist-400 border-mist-400/20",
    border: "border-mist-400/15",
    belief: "text-mist-400/60",
    title: "text-mist-400",
  },
  red: {
    badge: "bg-rust-400/10 text-rust-400 border-rust-400/20",
    border: "border-rust-400/15",
    belief: "text-rust-400/60",
    title: "text-rust-400",
  },
  green: {
    badge: "bg-sage-400/10 text-sage-400 border-sage-400/20",
    border: "border-sage-400/15",
    belief: "text-sage-400/60",
    title: "text-sage-400",
  },
};

/**
 * Picks the colour name for a pattern.
 *
 * @param id - A "P"-prefixed pattern id, e.g. "P14".
 * @returns One of "amber" | "blue" | "red" | "green".
 */
export function getPatternColor(id: string): PatternColor {
  const index = (patternNumber(id) - 1) % COLOR_CYCLE.length;
  return COLOR_CYCLE[index < 0 ? 0 : index];
}

/**
 * Picks the Tailwind classes for a pattern, ready to drop into `className`.
 *
 * @param id - A "P"-prefixed pattern id, e.g. "P14".
 * @returns The class strings for that pattern's colour.
 */
export function getPatternColorClasses(id: string): PatternColorClasses {
  return CLASSES[getPatternColor(id)];
}
