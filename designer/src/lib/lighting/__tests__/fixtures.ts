import type { FixtureSpec, RoomInput } from "../types";

export const measured = (value: number) => ({ value, source: "measured" as const });

export const livingRoom: RoomInput = {
  spaceType: "living_room",
  length: measured(5.5),
  width: measured(4),
  ceilingHeight: measured(2.85),
};

export const downlight60: FixtureSpec = {
  lumens: 1000,
  watts: 10,
  beamAngle: 60,
  mounting: "recessed",
  specSource: "generic_reference",
};

export const cob36: FixtureSpec = {
  lumens: 900,
  watts: 10,
  beamAngle: 36,
  mounting: "recessed",
  specSource: "generic_reference",
};
