export const FPS = 30;

export const SCENES = {
  hook:         { start: 0,    duration: 90  },  // 0:00-0:03
  testCreation: { start: 90,   duration: 450 },  // 0:03-0:18
  running:      { start: 540,  duration: 270 },  // 0:18-0:27
  results:      { start: 810,  duration: 480 },  // 0:27-0:43
  personas:     { start: 1290, duration: 360 },  // 0:43-0:55
  closing:      { start: 1650, duration: 150 },  // 0:55-1:00
} as const;

export const TOTAL_FRAMES = 1800; // 60 seconds
