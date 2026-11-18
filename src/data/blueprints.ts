import type {
  AnalyticsSnapshot,
  FunLessonPlan,
  PaletteId,
  QuizQuestion,
  TeachMateTool,
} from '../types';

export const PALETTES: Record<
  PaletteId,
  {
    id: PaletteId;
    name: string;
    subtitle: string;
    swatches: [string, string, string, string];
  }
> = {
  cyber: {
    id: 'cyber',
    name: 'Cyber Tech',
    subtitle: 'Midnight Navy · Electric Blue · Violet · Cyan',
    swatches: ['#080D1B', '#397BFF', '#8758FF', '#36D9F5'],
  },
  mocha: {
    id: 'mocha',
    name: 'Mocha, Gold & Amber',
    subtitle: 'Rich Mocha · Champagne Gold · Burnt Amber',
    swatches: ['#2B1E16', '#F5D061', '#C86428', '#E07A38'],
  },
  forest: {
    id: 'forest',
    name: 'Charcoal, Forest & Crimson',
    subtitle: 'Charcoal · Forest Green · Mint Emerald · Crimson',
    swatches: ['#111417', '#2D6A4F', '#52B788', '#E63946'],
  },
};

export const STUDENT_AVATARS = ['🦊', '🚀', '⚡', '🔬', '🌟', '🤖', '🎓', '🧠'];

export const TEACHING_STYLES = [
  {
    id: 'Gamified Learning',
    description: 'Points, squad quests, timed boss challenges, and instant feedback loops.',
  },
  {
    id: 'Storytelling Hooks',
    description: 'Narrative mystery arcs where students uncover core scientific principles.',
  },
  {
    id: 'Collaborative Group Activities',
    description: 'Role-assigned 4-person squads building and defending shared models.',
  },
  {
    id: 'Real-Life Demonstrations',
    description: 'Hands-on classroom experiments using everyday low-cost apparatus.',
  },
  {
    id: 'Interactive Quizzes',
    description: 'Rapid buzzer rounds, prediction polls, and misconception diagnostics.',
  },
  {
    id: 'Problem-Solving Sprints',
    description: '15-minute engineering design challenges tied to real community constraints.',
  },
];

export const MANDATORY_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q-mandatory-1',
    topic: 'Semiconductor Physics & Electronics',
    question: 'Which semiconductor has the highest energy band gap among the following?',
    options: ['Germanium', 'Silicon', 'Gallium Arsenide', 'Diamond'],
    correctIndex: 3,
    timeLimit: 20,
    explanation:
      'Diamond has an ultra-wide energy band gap (~5.47 eV), significantly higher than Gallium Arsenide (~1.42 eV), Silicon (~1.12 eV), and Germanium (~0.67 eV).',
    mandatory: true,
  },
  {
    id: 'q-mandatory-2',
    topic: 'Semiconductor Physics & Electronics',
    question: 'What happens to the resistance of a metallic conductor when its temperature increases?',
    options: ['Decreases', 'Increases', 'Remains constant', 'Becomes zero'],
    correctIndex: 1,
    timeLimit: 20,
    explanation:
      'In metallic conductors, rising temperature increases lattice ion vibrations, leading to more frequent electron collisions and higher electrical resistance.',
    mandatory: true,
  },
  {
    id: 'q-mandatory-3',
    topic: 'Optics & Photonics',
    question: 'Which phenomenon is responsible for the working of optical fibres?',
    options: ['Reflection', 'Refraction', 'Total Internal Reflection', 'Diffraction'],
    correctIndex: 2,
    timeLimit: 20,
    explanation:
      'Optical fibres transmit light signals over long distances via Total Internal Reflection at the core-cladding interface when the angle of incidence exceeds the critical angle.',
    mandatory: true,
  },
  {
    id: 'q-mandatory-4',
    topic: 'Electromagnetism',
    question: 'What is the SI unit of magnetic flux?',
    options: ['Tesla', 'Weber', 'Henry', 'Gauss'],
    correctIndex: 1,
    timeLimit: 20,
    explanation:
      'The SI unit of magnetic flux is the Weber (Wb), equal to 1 T·m². Tesla measures magnetic flux density, while Henry measures inductance.',
    mandatory: true,
  },
  {
    id: 'q-mandatory-5',
    topic: 'Semiconductor Physics & Electronics',
    question: 'In a PN junction diode under forward bias, the depletion region:',
    options: ['Increases', 'Decreases', 'Remains unchanged', 'Becomes infinite'],
    correctIndex: 1,
    timeLimit: 20,
    explanation:
      'Forward biasing opposes the built-in potential barrier, pushing majority carriers toward the junction and narrowing (decreasing) the depletion region width.',
    mandatory: true,
  },
];

export const DEFAULT_QUIZ_QUESTIONS: QuizQuestion[] = [
  ...MANDATORY_QUIZ_QUESTIONS,
  {
    id: 'q-sdg4-1',
    topic: 'Photosynthesis & Cellular Energy',
    question: 'Which cellular organelle converts solar light energy into chemical glucose during photosynthesis?',
    options: ['Mitochondrion', 'Chloroplast', 'Ribosome', 'Golgi Apparatus'],
    correctIndex: 1,
    timeLimit: 20,
    explanation: 'Chloroplasts contain chlorophyll pigments in thylakoid membranes that capture photons to drive ATP and glucose synthesis.',
  },
  {
    id: 'q-sdg4-2',
    topic: "Newton's Laws of Motion",
    question: 'When a rocket expels exhaust gases downward and accelerates upward, which law of motion directly explains this?',
    options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", 'Law of Conservation of Charge'],
    correctIndex: 2,
    timeLimit: 20,
    explanation: "Newton's Third Law states that every action force produces an equal and opposite reaction force.",
  },
  {
    id: 'q-sdg4-3',
    topic: 'Renewable Energy & Microgrids',
    question: 'Which energy transformation occurs inside a photovoltaic solar panel under sunlight?',
    options: [
      'Thermal to Mechanical Energy',
      'Light to Electrical Energy',
      'Chemical to Nuclear Energy',
      'Kinetic to Potential Energy',
    ],
    correctIndex: 1,
    timeLimit: 20,
    explanation: 'Photovoltaic silicon cells excite electrons upon absorbing photons, directly generating direct-current electricity.',
  },
  {
    id: 'q-sdg4-4',
    topic: 'UN SDG 4 & Innovation',
    question: 'What is the primary global focus of United Nations Sustainable Development Goal 4 (SDG 4)?',
    options: [
      'Clean Water & Sanitation',
      'Affordable & Clean Energy',
      'Inclusive & Equitable Quality Education',
      'Industry, Innovation & Infrastructure',
    ],
    correctIndex: 2,
    timeLimit: 20,
    explanation: 'UN SDG 4 aims to ensure inclusive and equitable quality education and promote lifelong learning opportunities for all.',
  },
];

export function buildFallbackBlueprint(topic: string, style: string): FunLessonPlan {
  const cleanTopic = topic.trim() || 'Renewable Energy & Microgrids';
  return {
    title: `${cleanTopic}: ${style} Lab`,
    topic: cleanTopic,
    style,
    hook: `Open class by placing a mystery everyday scenario on the projector connected to ${cleanTopic}. Give squads 90 seconds to predict what fails or succeeds before revealing the core principle.`,
    learningObjective: `Students will model, test, and explain the core mechanism behind ${cleanTopic} through ${style.toLowerCase()} and verify understanding via live squad buzzers.`,
    materials: [
      'Classroom Smartboard or projector connected to QuizBuzz PIN 360360',
      '4-Squad physical Arduino buzzer kit or student mobile devices',
      'Index cards, whiteboard markers, and stopwatch timer',
      'Simple physical demo props relevant to the topic',
    ],
    timeline: [
      {
        phase: '01. Curiosity Ignition Hook',
        minutes: 7,
        activity: `Pose a counter-intuitive prediction prompt around ${cleanTopic} and collect quick hand/buzzer votes.`,
      },
      {
        phase: '02. Core Concept Micro-Brief',
        minutes: 10,
        activity: `Break down the primary mechanism using an everyday analogy and interactive diagram on the Smartboard.`,
      },
      {
        phase: '03. Squad Mission Sprint',
        minutes: 18,
        activity: `Run a structured ${style.toLowerCase()} challenge where 4-student squads solve a real-world constraint.`,
      },
      {
        phase: '04. QuizBuzz Live Showdown',
        minutes: 10,
        activity: 'Launch 3 rapid-fire buzzer rounds in QuizBuzz Live to surface misconceptions and award squad XP.',
      },
    ],
    squadRoles: [
      { role: 'Lead Strategist', task: 'Keeps the squad focused on the core hypothesis and guides decision consensus.' },
      { role: 'Phenomenon Analyst', task: 'Maps observations and formulas to the real-world physical mechanism.' },
      { role: 'Rapid Buzzer Captain', task: 'Operates the squad buzzer/device after confirming team agreement.' },
      { role: 'Pitch Presenter', task: 'Summarizes the squad reasoning in 30 seconds during the class debrief.' },
    ],
    assessmentPlan:
      'Use the 3-question QuizBuzz check for real-time misconception telemetry plus a 1-sentence exit ticket asking each student to teach the concept to a younger peer.',
    bonusIdeas: [
      `Connect an Arduino Uno buzzer kit to turn the final 5 minutes into a tournament round on ${cleanTopic}.`,
      'Award double XP to any squad that catches and explains a deliberate error planted in your demonstration.',
    ],
    sampleQuizQuestions: [
      {
        id: `fb-${Date.now()}-1`,
        topic: cleanTopic,
        question: `In our ${cleanTopic} activity, what is the primary driver that initiates the core process?`,
        options: [
          'Input energy or triggering stimulus',
          'Random background noise alone',
          'Zero-state equilibrium lock',
          'Static container geometry',
        ],
        correctIndex: 0,
        timeLimit: 20,
        explanation: `Every active system in ${cleanTopic} requires an initial energy input or causal trigger to shift out of equilibrium.`,
      },
      {
        id: `fb-${Date.now()}-2`,
        topic: cleanTopic,
        question: `Which classroom strategy best verifies that a squad truly understands ${cleanTopic}?`,
        options: [
          'Memorizing a dictionary definition',
          'Predicting what changes when one variable doubles',
          'Copying notes silently without discussion',
          'Skipping experimental testing',
        ],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'Causal prediction under changing variables proves transferable conceptual mastery rather than rote recall.',
      },
    ],
  };
}

export const TEACHMATE_TOOLS: TeachMateTool[] = [
  {
    id: 'lesson-architect',
    title: 'Lesson Architect',
    subtitle: '45-minute structured flow with hooks & timings',
    placeholder: 'Ask any question...',
    suggestedPrompts: [],
  },
  {
    id: 'phenomenon-connector',
    title: 'Real-World Phenomenon Connector',
    subtitle: 'Anchor theory in observable everyday events',
    placeholder: 'Ask any question...',
    suggestedPrompts: [],
  },
  {
    id: 'analogy-generator',
    title: 'Analogy & Metaphor Generator',
    subtitle: 'Memorable mental models for abstract ideas',
    placeholder: 'Ask any question...',
    suggestedPrompts: [],
  },
  {
    id: 'feynman-simplifier',
    title: 'Complex Concept Simplifier (Feynman Technique)',
    subtitle: 'Zero-jargon intuition builders',
    placeholder: 'Ask any question...',
    suggestedPrompts: [],
  },
  {
    id: 'misconception-buster',
    title: 'Student Misconception Buster',
    subtitle: 'Diagnose and repair common mental traps',
    placeholder: 'Ask any question...',
    suggestedPrompts: [],
  },
  {
    id: 'debate-prompts',
    title: 'Classroom Debate & Discussion Prompts',
    subtitle: 'High-agency Socratic dilemmas & SDG 4 ethics',
    placeholder: 'Ask any question...',
    suggestedPrompts: [],
  },
  {
    id: 'formative-assessments',
    title: 'Formative Quick-Check Assessments',
    subtitle: '3-minute hinge questions & exit tickets',
    placeholder: 'Ask any question...',
    suggestedPrompts: [],
  },
  {
    id: 'differentiated-scaffolds',
    title: 'Differentiated Learning Scaffolds',
    subtitle: 'Tiered support for diverse & multilingual learners',
    placeholder: 'Ask any question...',
    suggestedPrompts: [],
  },
];

export const MEMORY_MATCH_PAIRS = [
  { id: 'p1', term: 'Photosynthesis', match: 'Light energy converted to glucose in chloroplasts' },
  { id: 'p2', term: 'Inertia', match: 'Tendency of mass to resist changes in motion' },
  { id: 'p3', term: 'Ohm’s Law', match: 'Voltage equals current multiplied by resistance' },
  { id: 'p4', term: 'Catalyst', match: 'Speeds up a reaction without being consumed' },
  { id: 'p5', term: 'Photovoltaic Cell', match: 'Converts sunlight directly into DC electricity' },
  { id: 'p6', term: 'Algorithm', match: 'Finite step-by-step procedure to solve a problem' },
];

export const SORTING_ITEMS = [
  { id: 's1', name: 'Solar Photovoltaic Array', category: 'renewable' as const },
  { id: 's2', name: 'Anthracite Coal Plant', category: 'nonrenewable' as const },
  { id: 's3', name: 'Offshore Wind Turbine', category: 'renewable' as const },
  { id: 's4', name: 'Crude Petroleum Diesel', category: 'nonrenewable' as const },
  { id: 's5', name: 'Geothermal Steam Well', category: 'renewable' as const },
  { id: 's6', name: 'Natural Gas Turbine', category: 'nonrenewable' as const },
  { id: 's7', name: 'Run-of-River Hydro', category: 'renewable' as const },
  { id: 's8', name: 'Oil Shale Extraction', category: 'nonrenewable' as const },
  { id: 's9', name: 'Tidal Barrage Generator', category: 'renewable' as const },
  { id: 's10', name: 'Bituminous Coal Boiler', category: 'nonrenewable' as const },
];

export const CIPHER_WORDS = [
  { word: 'ELECTRON', hint: 'Negatively charged subatomic particle orbiting a nucleus' },
  { word: 'CATALYST', hint: 'Substance that lowers activation energy in a reaction' },
  { word: 'MOMENTUM', hint: 'Product of an object’s mass and velocity' },
  { word: 'ECOSYSTEM', hint: 'Biological community interacting with its physical environment' },
  { word: 'VOLTAGE', hint: 'Electrical potential difference between two points' },
  { word: 'OSMOSIS', hint: 'Water diffusion across a semipermeable membrane' },
  { word: 'GRAVITY', hint: 'Fundamental attraction between any two masses' },
  { word: 'PHOTON', hint: 'Elementary packet or quantum of electromagnetic light energy' },
  { word: 'SILICON', hint: 'Widely used semiconductor element in microchips and solar cells' },
  { word: 'ENTROPY', hint: 'Thermodynamic measure of disorder in a system' },
  { word: 'ISOTOPE', hint: 'Atoms of the same element with different numbers of neutrons' },
  { word: 'POLYMER', hint: 'Large molecule built from many repeating monomer units' },
  { word: 'FRICTION', hint: 'Resistive force opposing relative motion between two surfaces' },
  { word: 'CONDUCTOR', hint: 'Material allowing electric charge or heat to flow easily' },
  { word: 'FREQUENCY', hint: 'Number of complete wave cycles passing a point per second' },
  { word: 'ALGORITHM', hint: 'Step-by-step finite procedure for solving a computation' },
  { word: 'MAGNETISM', hint: 'Physical force produced by moving electric charges and dipoles' },
  { word: 'DIFFRACTION', hint: 'Bending and spreading of waves around obstacles or slits' },
];

export const RAPID_RUSH_QUESTIONS: Array<{
  q: string;
  options: [string, string, string, string];
  ans: number;
}> = [
  { q: 'SI unit of electrical resistance?', options: ['Volt', 'Ampere', 'Ohm', 'Watt'], ans: 2 },
  { q: 'Chemical symbol for Sodium?', options: ['So', 'Na', 'Sd', 'Sn'], ans: 1 },
  { q: 'Which planet has the most moons in our solar system?', options: ['Mars', 'Jupiter', 'Saturn', 'Uranus'], ans: 2 },
  { q: 'What gas makes up ~78% of Earth’s atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Argon'], ans: 1 },
  { q: 'Derivative of x² with respect to x?', options: ['x', '2x', 'x²', '2'], ans: 1 },
  { q: 'Speed of light in vacuum (approx)?', options: ['3×10⁵ km/s', '3×10³ km/s', '3×10⁸ km/s', '1.5×10⁵ km/s'], ans: 0 },
  { q: 'pH value of pure neutral water at 25°C?', options: ['0', '5', '7', '14'], ans: 2 },
  { q: 'Which logic gate outputs 1 only when BOTH inputs are 1?', options: ['OR', 'XOR', 'AND', 'NAND'], ans: 2 },
  { q: 'Powerhouse organelle producing ATP in eukaryotic cells?', options: ['Nucleus', 'Mitochondrion', 'Vacuole', 'Lysosome'], ans: 1 },
  { q: 'Binary representation of decimal 13?', options: ['1011', '1101', '1110', '1001'], ans: 1 },
];

export const BENCHMARK_ANALYTICS: AnalyticsSnapshot = {
  weeklyParticipation: [
    { day: 'Mon', attendance: 84, quizActive: 78 },
    { day: 'Tue', attendance: 89, quizActive: 85 },
    { day: 'Wed', attendance: 92, quizActive: 90 },
    { day: 'Thu', attendance: 90, quizActive: 88 },
    { day: 'Fri', attendance: 96, quizActive: 94 },
    { day: 'Sat', attendance: 88, quizActive: 84 },
  ],
  topicMastery: [
    { subject: 'Photosynthesis & Cellular Energy', mastery: 91, sessions: 14 },
    { subject: "Newton's Laws of Motion", mastery: 86, sessions: 12 },
    { subject: 'Renewable Energy Microgrids', mastery: 94, sessions: 11 },
    { subject: 'Acid-Base Equilibrium', mastery: 79, sessions: 9 },
    { subject: 'Algorithmic Logic & Circuits', mastery: 88, sessions: 10 },
  ],
  studentRoster: [
    { id: 'st-1', name: 'Aarav Nair', squad: 'blue', accuracy: 94, avgResponseSec: 3.1, xp: 2450, sessionsCompleted: 18 },
    { id: 'st-2', name: 'Meera Krishnan', squad: 'green', accuracy: 91, avgResponseSec: 3.6, xp: 2290, sessionsCompleted: 17 },
    { id: 'st-3', name: 'Liam Chen', squad: 'red', accuracy: 88, avgResponseSec: 2.9, xp: 2180, sessionsCompleted: 16 },
    { id: 'st-4', name: 'Sofia Alvarez', squad: 'yellow', accuracy: 85, avgResponseSec: 4.2, xp: 1960, sessionsCompleted: 15 },
    { id: 'st-5', name: 'Karthik Rajan', squad: 'blue', accuracy: 89, avgResponseSec: 3.4, xp: 2110, sessionsCompleted: 16 },
    { id: 'st-6', name: 'Nadia Patel', squad: 'green', accuracy: 93, avgResponseSec: 3.0, xp: 2380, sessionsCompleted: 18 },
  ],
};

export const ARDUINO_SKETCH = `/*
 * SMARTFUN 360 - QuizBuzz Hardware Buzzer Kit
 * IDEALAB Innovation Hub | UN SDG 4 Quality Education
 *
 * Wiring:
 * - Red Squad Button    -> Pin 2 (to GND, INPUT_PULLUP)
 * - Blue Squad Button   -> Pin 3 (to GND, INPUT_PULLUP)
 * - Green Squad Button  -> Pin 4 (to GND, INPUT_PULLUP)
 * - Yellow Squad Button -> Pin 5 (to GND, INPUT_PULLUP)
 * - Piezo Buzzer (+)    -> Pin 8
 * - 16x2 I2C LCD        -> SDA (A4), SCL (A5), 5V, GND
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

const int BTN_PINS[4] = {2, 3, 4, 5};
const char* SQUAD_NAMES[4] = {"RED SQUAD", "BLUE SQUAD", "GREEN SQUAD", "YELLOW SQUAD"};
const int TONES[4] = {523, 659, 784, 880};
const int BUZZER_PIN = 8;

unsigned long lastTriggerMs = 0;
const unsigned long DEBOUNCE_DELAY = 350;

void setup() {
  Serial.begin(9600);
  pinMode(BUZZER_PIN, OUTPUT);

  for (int i = 0; i < 4; i++) {
    pinMode(BTN_PINS[i], INPUT_PULLUP);
  }

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("SMARTFUN 360");
  lcd.setCursor(0, 1);
  lcd.print("PIN: 360360 RDY");
}

void loop() {
  if (millis() - lastTriggerMs < DEBOUNCE_DELAY) return;

  for (int i = 0; i < 4; i++) {
    if (digitalRead(BTN_PINS[i]) == LOW) {
      lastTriggerMs = millis();

      // Emit serial packet consumed by SMARTFUN 360 Web Serial API
      Serial.print("BTN:");
      Serial.println(i + 1);

      // Audible piezo feedback
      tone(BUZZER_PIN, TONES[i], 140);

      // Update 16x2 LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("BUZZED IN:");
      lcd.setCursor(0, 1);
      lcd.print(SQUAD_NAMES[i]);
      break;
    }
  }
}
`;
