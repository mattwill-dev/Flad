// Seed data for the mock gateway. Mutated in-process by the mock's write
// endpoints so a dev session behaves like a real one (create a recipe, hide a
// profile, rate a shot — it all sticks until the server restarts).

export const machineState = { state: "idle", substate: "ready" };

export const machineInfo = {
  name: "Mock DE1",
  version: "1.6.0",
  serial: "MOCK-0001",
};

export const waterLevels = { currentLevel: 780, refillLevel: 100 };

const step = (temperature, seconds, pressure) => ({
  name: `Step ${temperature}`,
  temperature,
  seconds,
  pressure,
  pump: "pressure",
});

export const profiles = [
  {
    id: "profile:mock-default",
    isDefault: true,
    metadata: { source: "stock" },
    profile: {
      title: "Classic Italian espresso",
      author: "Decent",
      beverage_type: "espresso",
      steps: [step(92, 10, 3), step(92, 20, 9)],
    },
  },
  {
    id: "profile:mock-user",
    metadata: { source: "user" },
    profile: {
      title: "My Blooming Espresso",
      author: "You",
      version: 2,
      beverage_type: "espresso",
      steps: [step(93, 8, 2), step(93, 5, 0), step(92, 22, 8)],
    },
  },
  // Deliberately hidden — exercises the hidden-profile push path (the bug that
  // motivated resolving pushes against the visible+hidden set).
  {
    id: "profile:mock-hidden",
    visibility: "hidden",
    metadata: { source: "user" },
    profile: {
      title: "Hidden Turbo",
      author: "You",
      beverage_type: "espresso",
      steps: [step(90, 6, 6), step(90, 18, 6)],
    },
  },
  {
    id: "profile:mock-cleaning",
    metadata: { source: "user" },
    profile: {
      // Distinct title from the real "Cleaning/Forward Flush x5" preset-row
      // fixture below (source: "stock") — this one exists to exercise a
      // user-owned/renamed cleaning profile, not to duplicate that one.
      title: "My Cleaning Flush x5",
      beverage_type: "cleaning",
      steps: [
        step(90, 5, 8),
        step(90, 5, 0),
        step(90, 5, 8),
        step(90, 5, 0),
        step(90, 5, 8),
      ],
    },
  },
  // Preset-row fixtures (below) back the 4 quick-select tiles on the recipes
  // screen — see the nsx_recipe_preset_ids entry in `store` further down.
  // Real profiles pulled from an actual DE1, not synthesized — titles/notes/
  // steps are verbatim (the cleaning profile was hand-converted from the
  // legacy de1app .tcl advanced_shot format, values otherwise unchanged).
  {
    id: "profile:mock-cremina",
    isDefault: true,
    metadata: { source: "stock" },
    profile: {
      title: "Cremina lever machine 4",
      author: "Decent",
      notes: "Aim for a 50 second shot time to have a thick espresso in the style of the much-loved Cremina manual lever machine. By Denis from KafaTek.",
      beverage_type: "espresso",
      target_weight: "40",
      steps: [
        {
          name: "preinfusion",
          temperature: "91.5",
          sensor: "coffee",
          pump: "pressure",
          transition: "fast",
          pressure: "1.1",
          flow: "4",
          seconds: "5.0",
          volume: "100",
          weight: "0",
          exit: { type: "pressure", condition: "over", value: "3.0" },
        },
        {
          name: "soak",
          temperature: "91.5",
          sensor: "coffee",
          pump: "pressure",
          transition: "fast",
          pressure: "1.1",
          flow: "0.0",
          seconds: "10.0",
          volume: "100",
          weight: "0",
        },
        {
          name: "ramp",
          temperature: "91.5",
          sensor: "coffee",
          pump: "pressure",
          transition: "smooth",
          pressure: "9.0",
          flow: "",
          seconds: "10.0",
          volume: "100",
          weight: "0",
        },
        {
          name: "ramp-down",
          temperature: "92.0",
          sensor: "coffee",
          pump: "pressure",
          transition: "smooth",
          pressure: "3.0",
          flow: "",
          seconds: "50.0",
          volume: "100",
          weight: "0",
        },
      ],
    },
  },
  {
    id: "profile:mock-filter3",
    isDefault: true,
    metadata: { source: "stock" },
    profile: {
      title: "Filter3",
      author: "Decent",
      notes: "Set your grinder as coarsely as it can be set (11am setting on a Niche Zero).  Center a 58.5mm filter paper in the bottom of a Filter3 basket. Wet it with Flush water. Add 22 grams of coffee and shake to level the grounds.  Gently lock the portafilter in.  Place a cup, tap the COFFEE icon on the Group Head to start.  Optional: 30 seconds into the extraction, unlock the portafilter, swirl and check for 2cm-4cm of water on the grounds.  Adjust the grind if necessary for next time: finer if you saw not enough water, coarser if there was too much water on the grounds.  If water comes out of the holes at the top of the basket, your grind is too fine.",
      beverage_type: "filter",
      target_weight: "0.0",
      steps: [
        {
          name: "Prewet",
          temperature: "94.0",
          sensor: "coffee",
          pump: "flow",
          transition: "fast",
          pressure: "9.0",
          flow: "4.1",
          seconds: "15",
          volume: "75",
          weight: "0",
          limiter: { value: "5.0", range: "1.0" },
        },
        {
          name: "Bloom",
          temperature: "94.0",
          sensor: "coffee",
          pump: "flow",
          transition: "fast",
          pressure: "9.0",
          flow: "0",
          seconds: "30",
          volume: "75",
          weight: "0",
          limiter: { value: "0", range: "1.0" },
        },
        {
          name: "Step 1a",
          temperature: "92.0",
          sensor: "coffee",
          pump: "flow",
          transition: "fast",
          pressure: "9.0",
          flow: "1.1",
          seconds: "30",
          volume: "200",
          weight: "0",
          limiter: { value: "0", range: "1.0" },
        },
        {
          name: "Step 1b",
          temperature: "92.0",
          sensor: "coffee",
          pump: "flow",
          transition: "fast",
          pressure: "9.0",
          flow: "1.1",
          seconds: "30",
          volume: "200",
          weight: "0",
          limiter: { value: "0", range: "1.0" },
        },
        {
          name: "Step 2",
          temperature: "90.0",
          sensor: "coffee",
          pump: "flow",
          transition: "fast",
          pressure: "9.0",
          flow: "1.1",
          seconds: "60",
          volume: "200",
          weight: "0",
          limiter: { value: "0", range: "1.0" },
        },
        {
          name: "Step 3",
          temperature: "88.0",
          sensor: "coffee",
          pump: "flow",
          transition: "fast",
          pressure: "9.0",
          flow: "1.1",
          seconds: "100",
          volume: "200",
          weight: "0",
          limiter: { value: "0", range: "1.0" },
        },
      ],
    },
  },
  {
    id: "profile:mock-cleaning-flush-5",
    isDefault: true,
    metadata: { source: "stock" },
    profile: {
      title: "Cleaning/Forward Flush x5",
      notes: "A convenient way to 5 times flush and clean your group head.  (1) Put a blind basket in your portafilter  (2) Put 3g (1/2 teaspoon) of espresso machine detergent in the blind basket  (3) Run this profile  (4) When it is done, remove the portafilter off Flush the DE1 until the water goes clear  (5) Put the portafilter back without detergent and run this profile again  (6) Finally, run FLUSH for 20 seconds.",
      beverage_type: "cleaning",
      steps: [
        { name: "Pressure rise 1 start", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "10.0", flow: "4.0", seconds: "2.0", volume: "500.0", weight: "0" },
        { name: "Pressure rise 1", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "10.0", flow: "4.0", seconds: "18.0", volume: "500.0", weight: "0" },
        { name: "Pause 1", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "0", flow: "6.5", seconds: "15.0", volume: "500.0", weight: "0", exit: { type: "pressure", condition: "over", value: "7.0" } },
        { name: "Pressure rise 2", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "10.0", flow: "6.5", seconds: "15.0", volume: "500.0", weight: "0", exit: { type: "pressure", condition: "over", value: "7.0" } },
        { name: "Pause 2", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "0", flow: "6.5", seconds: "15.0", volume: "500.0", weight: "0", exit: { type: "pressure", condition: "over", value: "7.0" } },
        { name: "Pressure rise 3", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "10.0", flow: "6.5", seconds: "15.0", volume: "500.0", weight: "0", exit: { type: "pressure", condition: "over", value: "7.0" } },
        { name: "Pause 3", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "0", flow: "6.5", seconds: "15.0", volume: "500.0", weight: "0", exit: { type: "pressure", condition: "over", value: "7.0" } },
        { name: "Pressure rise 4", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "10.0", flow: "6.5", seconds: "15.0", volume: "500.0", weight: "0", exit: { type: "pressure", condition: "over", value: "7.0" } },
        { name: "Pause 4", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "0", flow: "6.5", seconds: "15.0", volume: "500.0", weight: "0", exit: { type: "pressure", condition: "over", value: "7.0" } },
        { name: "Pressure rise 5", temperature: "85.0", sensor: "coffee", pump: "pressure", transition: "fast", pressure: "10.0", flow: "6.5", seconds: "15.0", volume: "500.0", weight: "0", exit: { type: "pressure", condition: "over", value: "7.0" } },
      ],
    },
  },
  {
    id: "profile:mock-rao-allonge",
    isDefault: true,
    metadata: { source: "stock" },
    profile: {
      title: "Rao Allongé",
      author: "Decent",
      notes: "An amazing long espresso for light roasts, this is the biggest fruit bomb of any brewing method we know.  5:1 ratio, 35-40 seconds, coarse espresso grind. If close to the right pressure, make 0.5g dose adjustments to get to an 8-9 bar peak. The very high flow rate means small grind adjustments cause big pressure changes. An advanced technique, allongé averages 24% extraction.",
      beverage_type: "espresso",
      target_weight: "90",
      target_volume: "180",
      steps: [
        {
          name: "hold at 4.5 ml/s",
          temperature: "92.00",
          sensor: "coffee",
          pump: "flow",
          transition: "fast",
          pressure: "0",
          flow: "4.50",
          seconds: "60.00",
          volume: "500",
          weight: "0",
          limiter: { value: "8.6", range: "0.6" },
        },
      ],
    },
  },
];

export const deletedProfiles = [];

export const beans = [
  {
    id: "bean-1",
    roaster: "Mock Roasters",
    name: "Yirgacheffe",
    roastDate: "2026-06-20",
    archived: false,
  },
];

export const beanBatches = {
  "bean-1": [
    {
      id: "batch-1",
      beanId: "bean-1",
      roastDate: "2026-06-20",
      archived: false,
    },
  ],
};

export const grinders = [
  { id: "grinder-1", model: "Niche Zero", settingType: "stepless" },
  { id: "grinder-2", model: "DF64", settingType: "stepless" },
];

// A single measurement sample, shaped to match what NSXCore.normalizeShotData
// (packages/core/src/domains/mapping.js) actually reads from a real shot's
// measurements[] — nested under `machine`, with a state.substate of
// "preinfusion"/"pouring" (any other substate, or a missing `machine`, is
// silently skipped, which is why the flatter shape used here previously
// rendered "No data" for every mock shot).
const m = (
  elapsedSec,
  pressure,
  targetPressure,
  flow,
  targetFlow,
  groupTemperature,
  targetGroupTemperature,
  substate,
) => ({
  __elapsedSec: elapsedSec, // consumed by shot()/realShot() to derive machine.timestamp
  machine: {
    pressure,
    targetPressure,
    flow,
    targetFlow,
    groupTemperature,
    targetGroupTemperature,
    state: { substate },
  },
  scale: { weightFlow: substate === "pouring" ? 2 : 0 },
});

function withTimestamps(measurements, startMs) {
  return measurements.map(({ __elapsedSec, ...rest }) => ({
    ...rest,
    machine: {
      ...rest.machine,
      timestamp: new Date(startMs + __elapsedSec * 1000).toISOString(),
    },
  }));
}

const shot = (id, minutesAgo, enjoyment) => {
  const startMs = Date.now() - minutesAgo * 60_000;
  const start = new Date(startMs).toISOString();
  const n = 40;
  const measurements = Array.from({ length: n }, (_, i) =>
    m(
      i * 0.8,
      i < 6 ? i : 9 - i * 0.05,
      9,
      i < 6 ? 0.4 : 2.1,
      2.2,
      92,
      93,
      i < 6 ? "preinfusion" : "pouring",
    ),
  );
  return {
    id,
    startTime: start,
    timestamp: start,
    annotations: {
      enjoyment,
      espressoNotes: null,
      extras: { favorite: false, tags: [] },
    },
    workflow: {
      profile: { title: "My Blooming Espresso", steps: [] },
      context: {
        coffeeRoaster: "Mock Roasters",
        coffeeName: "Yirgacheffe",
        grinderModel: "Niche Zero",
        grinderSetting: "18",
        targetDoseWeight: 18,
        targetYield: 36,
      },
    },
    measurements: withTimestamps(measurements, startMs),
  };
};

// A real shot, pulled from the user's own DE1 (local-data/history_v2/,
// 2026-08-28) — a genuine "Cremina lever machine 4" pour: 18g in, 39.3g out,
// 46.5s. Downsampled from 224 to 56 samples. workflow.context matches the
// "Cremina lever machine 4" preset-row recipe exactly (see store.NSX.recipes
// below) so it's picked up as a real match, not the no-exact-match fallback.
const realCreminaShot = () => {
  const startMs = Date.parse("2026-08-28T07:33:30-05:00");
  const measurements = [
    m(0.04, 0.0, 0, 0.0, 0, 91.5, 91.5, "preinfusion"),
    m(0.86, 0.69, 1.12, 6.77, 0, 89.93, 91.5, "preinfusion"),
    m(1.69, 1.09, 1.12, 8.37, 0, 91.05, 91.5, "preinfusion"),
    m(2.55, 1.19, 1.12, 7.54, 0, 93.81, 91.5, "preinfusion"),
    m(3.37, 1.11, 1.12, 7.09, 0, 95.07, 91.5, "preinfusion"),
    m(4.24, 1.19, 1.12, 6.79, 0, 94.42, 91.5, "preinfusion"),
    m(5.06, 1.29, 1.12, 5.85, 0, 93.4, 91.5, "preinfusion"),
    m(5.85, 1.46, 1.25, 4.27, 0, 92.56, 91.5, "preinfusion"),
    m(6.67, 1.41, 1.19, 2.57, 0, 92.09, 91.5, "preinfusion"),
    m(7.61, 1.24, 1.19, 1.42, 0, 91.89, 91.5, "preinfusion"),
    m(8.4, 1.23, 1.19, 0.84, 0, 91.55, 91.5, "preinfusion"),
    m(9.19, 1.2, 1.19, 0.97, 0, 91.19, 91.5, "preinfusion"),
    m(10.09, 1.16, 1.19, 0.76, 0, 90.82, 91.5, "preinfusion"),
    m(10.95, 1.09, 1.19, 0.63, 0, 90.49, 91.5, "preinfusion"),
    m(11.7, 1.11, 1.19, 0.59, 0, 90.09, 91.5, "preinfusion"),
    m(12.57, 1.15, 1.19, 0.51, 0, 89.59, 91.5, "preinfusion"),
    m(13.35, 1.2, 1.19, 0.19, 0, 88.97, 91.5, "preinfusion"),
    m(14.17, 1.29, 1.19, 0.07, 0, 88.57, 91.5, "preinfusion"),
    m(15.05, 1.28, 1.19, 0.03, 0, 88.28, 91.5, "pouring"),
    m(15.9, 1.36, 1.62, 0.01, 0, 88.34, 91.5, "pouring"),
    m(16.73, 1.4, 2.19, 0.5, 0, 88.54, 91.5, "pouring"),
    m(17.57, 1.73, 2.81, 2.71, 0, 88.93, 91.5, "pouring"),
    m(18.39, 2.71, 3.44, 1.74, 0, 89.59, 91.5, "pouring"),
    m(19.24, 3.35, 4.12, 1.16, 0, 90.49, 91.5, "pouring"),
    m(20.06, 3.9, 4.75, 1.06, 0, 90.75, 91.5, "pouring"),
    m(20.89, 4.54, 5.38, 0.96, 0, 90.99, 91.5, "pouring"),
    m(21.71, 5.25, 6.0, 1.1, 0, 91.49, 91.5, "pouring"),
    m(22.65, 5.86, 6.69, 0.99, 0, 91.99, 91.5, "pouring"),
    m(23.36, 6.45, 7.31, 1.0, 0, 92.66, 91.5, "pouring"),
    m(24.26, 7.06, 7.94, 0.99, 0, 93.0, 91.5, "pouring"),
    m(25.01, 7.73, 8.56, 0.98, 0, 93.13, 91.5, "pouring"),
    m(25.87, 8.01, 7.88, 0.91, 0, 93.3, 92.0, "pouring"),
    m(26.7, 7.84, 7.81, 0.88, 0, 93.37, 92.0, "pouring"),
    m(27.56, 7.85, 7.69, 0.89, 0, 93.54, 92.0, "pouring"),
    m(28.47, 7.64, 7.62, 0.94, 0, 93.84, 92.0, "pouring"),
    m(29.36, 7.6, 7.56, 1.01, 0, 94.05, 92.0, "pouring"),
    m(30.07, 7.55, 7.44, 1.05, 0, 94.18, 92.0, "pouring"),
    m(30.87, 7.42, 7.38, 1.15, 0, 94.46, 92.0, "pouring"),
    m(31.69, 7.38, 7.31, 1.18, 0, 94.8, 92.0, "pouring"),
    m(32.55, 7.28, 7.19, 1.25, 0, 94.77, 92.0, "pouring"),
    m(33.38, 7.24, 7.12, 1.24, 0, 94.8, 92.0, "pouring"),
    m(34.23, 7.13, 7.06, 1.27, 0, 94.87, 92.0, "pouring"),
    m(35.1, 7.03, 7.0, 1.35, 0, 94.94, 92.0, "pouring"),
    m(35.86, 6.99, 6.88, 1.37, 0, 94.83, 92.0, "pouring"),
    m(36.72, 6.94, 6.81, 1.41, 0, 94.66, 92.0, "pouring"),
    m(37.58, 6.84, 6.75, 1.42, 0, 94.32, 92.0, "pouring"),
    m(38.4, 6.75, 6.62, 1.45, 0, 94.25, 92.0, "pouring"),
    m(39.21, 6.71, 6.56, 1.49, 0, 94.15, 92.0, "pouring"),
    m(40.05, 6.59, 6.5, 1.48, 0, 93.95, 92.0, "pouring"),
    m(40.87, 6.44, 6.44, 1.47, 0, 93.84, 92.0, "pouring"),
    m(41.74, 6.43, 6.31, 1.51, 0, 93.74, 92.0, "pouring"),
    m(42.6, 6.31, 6.25, 1.54, 0, 93.5, 92.0, "pouring"),
    m(43.35, 6.25, 6.19, 1.55, 0, 93.27, 92.0, "pouring"),
    m(44.21, 6.2, 6.06, 1.52, 0, 93.27, 92.0, "pouring"),
    m(45.04, 6.12, 6.0, 1.52, 0, 93.3, 92.0, "pouring"),
    m(45.87, 6.01, 5.94, 1.57, 0, 93.13, 92.0, "pouring"),
  ];
  return {
    id: "shot-real-cremina",
    startTime: new Date(startMs).toISOString(),
    timestamp: new Date(startMs).toISOString(),
    annotations: {
      enjoyment: 0,
      espressoNotes: null,
      actualYield: 39.3,
      extras: { favorite: false, tags: [] },
    },
    workflow: {
      profile: { title: "Cremina lever machine 4", steps: [] },
      context: {
        coffeeRoaster: "Mock Roasters",
        coffeeName: "Yirgacheffe",
        grinderModel: "Niche Zero",
        grinderSetting: "22",
        targetDoseWeight: 18,
        targetYield: 40,
      },
    },
    measurements: withTimestamps(measurements, startMs),
  };
};

export const shots = [
  shot("shot-1", 20, 4),
  shot("shot-2", 90, 5),
  shot("shot-3", 300, 3),
  realCreminaShot(),
];

// Key-value store, namespaced. Matches the real gateway's shape:
// GET /store/<ns>?full=1 returns this dict for <ns>.
export const store = {
  NSX: {
    recipes: [
      {
        id: "recipe-mock-1",
        lastUsed: Date.now() - 60_000,
        coffeeRoaster: "Mock Roasters",
        coffeeName: "Yirgacheffe",
        grinderModel: "Niche Zero",
        grinderSetting: "18",
        profileTitle: "My Blooming Espresso",
        selectedProfileId: "profile:mock-user",
        targetDoseWeight: 18,
        targetYield: 36,
        groupTemp: 93,
      },
      {
        id: "recipe-mock-hidden",
        lastUsed: Date.now() - 3_600_000,
        coffeeRoaster: "Mock Roasters",
        coffeeName: "Turbo Blend",
        grinderModel: "DF64",
        grinderSetting: "3.2",
        profileTitle: "Hidden Turbo",
        selectedProfileId: "profile:mock-hidden",
        targetDoseWeight: 20,
        targetYield: 50,
        groupTemp: 90,
      },
      // Preset-row fixtures — referenced by nsx_recipe_preset_ids below so the
      // 4 quick-select tiles on the recipes screen are populated on every
      // mock-server start (not just for the current in-process session).
      {
        id: "recipe-mock-preset-cremina",
        lastUsed: Date.now() - 7_200_000,
        coffeeRoaster: "Mock Roasters",
        coffeeName: "Yirgacheffe",
        grinderModel: "Niche Zero",
        grinderSetting: "22",
        profileTitle: "Cremina lever machine 4",
        selectedProfileId: "profile:mock-cremina",
        targetDoseWeight: 18,
        targetYield: 40,
        groupTemp: 91.5,
      },
      {
        id: "recipe-mock-preset-filter3",
        lastUsed: Date.now() - 10_800_000,
        coffeeRoaster: "Mock Roasters",
        coffeeName: "Yirgacheffe",
        grinderModel: "Niche Zero",
        grinderSetting: "11 o'clock (coarsest)",
        profileTitle: "Filter3",
        selectedProfileId: "profile:mock-filter3",
        targetDoseWeight: 22,
        targetYield: 0,
        groupTemp: 94,
      },
      {
        id: "recipe-mock-preset-cleaning5",
        lastUsed: Date.now() - 14_400_000,
        coffeeRoaster: "—",
        coffeeName: "—",
        grinderModel: "—",
        grinderSetting: "—",
        profileTitle: "Cleaning/Forward Flush x5",
        selectedProfileId: "profile:mock-cleaning-flush-5",
        targetDoseWeight: 0,
        targetYield: 0,
        groupTemp: 85,
      },
      {
        id: "recipe-mock-preset-rao-allonge",
        lastUsed: Date.now() - 18_000_000,
        coffeeRoaster: "Mock Roasters",
        coffeeName: "Turbo Blend",
        grinderModel: "Niche Zero",
        grinderSetting: "18",
        profileTitle: "Rao Allongé",
        selectedProfileId: "profile:mock-rao-allonge",
        targetDoseWeight: 18,
        targetYield: 90,
        groupTemp: 92,
      },
    ],
    nsx_recipe_preset_ids: [
      "recipe-mock-preset-cremina",
      "recipe-mock-preset-filter3",
      "recipe-mock-preset-cleaning5",
      "recipe-mock-preset-rao-allonge",
    ],
    "ui-settings": {},
  },
  skin: { theme: "dark" },
};

export const currentWorkflow = {
  profile: profiles[1].profile,
  profileId: profiles[1].id,
  context: store.NSX.recipes[0],
};
