/**
 * Seed concepts for Class 9 Odisha Board Science (BSE Odisha / SCERT)
 * At least 15 concepts across 2 key chapters with realistic prerequisite dependencies.
 *
 * Chapter 5: The Fundamental Unit of Life (Cell) / ଜୀବନର ମୌଳିକ ଏକକ (କୋଷ)
 * Chapter 8: Motion / ଗତି
 */

import type { SeedConceptInput } from '../types';

export const CLASS_9_ODISHA_SCIENCE_CONCEPTS: readonly SeedConceptInput[] = [
  // ==========================================
  // CHAPTER 5: THE FUNDAMENTAL UNIT OF LIFE (CELL)
  // ==========================================
  {
    id: 'sci-c5-cell-basics',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'କୋଷ ଏବଂ ଏହାର ଆବିଷ୍କାର (Cell and Discovery)',
    nameEn: 'Cell as the Fundamental Unit of Life',
    prerequisites: [],
  },
  {
    id: 'sci-c5-cell-membrane',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'ପ୍ଲାଜ୍ମା ଝିଲ୍ଲୀ ଓ ବିସରଣ (Plasma Membrane & Diffusion)',
    nameEn: 'Plasma Membrane and Diffusion',
    prerequisites: ['sci-c5-cell-basics'],
  },
  {
    id: 'sci-c5-osmosis',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'ପରାସରଣ ପ୍ରକ୍ରିୟା (Osmosis)',
    nameEn: 'Osmosis Across Semi-Permeable Membrane',
    prerequisites: ['sci-c5-cell-membrane'],
  },
  {
    id: 'sci-c5-cell-wall',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'କୋଷ ପ୍ରାଚୀର ଓ ସେଲ୍ୟୁଲୋଜ୍ (Cell Wall & Cellulose)',
    nameEn: 'Plant Cell Wall and Turgidity',
    prerequisites: ['sci-c5-cell-membrane'],
  },
  {
    id: 'sci-c5-nucleus',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'ନ୍ୟୁକ୍ଲିଅସ୍ ଓ ଗୁଣସୂତ୍ର (Nucleus & Chromosomes)',
    nameEn: 'Nucleus, Chromatin, and DNA',
    prerequisites: ['sci-c5-cell-basics'],
  },
  {
    id: 'sci-c5-cytoplasm',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'କୋଷଜୀବକ ଓ କୋଷାଙ୍ଗିକା (Cytoplasm & Organelles)',
    nameEn: 'Cytoplasm and Cytosol',
    prerequisites: ['sci-c5-cell-basics'],
  },
  {
    id: 'sci-c5-endoplasmic-reticulum',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'ଅନ୍ତଃପ୍ରରସ ଜାଳିକା (Endoplasmic Reticulum)',
    nameEn: 'Rough and Smooth Endoplasmic Reticulum',
    prerequisites: ['sci-c5-cytoplasm', 'sci-c5-nucleus'],
  },
  {
    id: 'sci-c5-mitochondria',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'ମାଇଟୋକଣ୍ଡ୍ରିଆ - ଶକ୍ତି କେନ୍ଦ୍ର (Mitochondria - Powerhouse)',
    nameEn: 'Mitochondria and ATP Production',
    prerequisites: ['sci-c5-cytoplasm'],
  },
  {
    id: 'sci-c5-plastids',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'ପ୍ଲାଷ୍ଟିଡ୍ ଓ ହରିତକଣିକା (Plastids & Chloroplasts)',
    nameEn: 'Plastids and Photosynthesis',
    prerequisites: ['sci-c5-cytoplasm', 'sci-c5-cell-wall'],
  },
  {
    id: 'sci-c5-plant-vs-animal-cells',
    subject: 'Science',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    nameOr: 'ଉଦ୍ଭିଦ ଓ ପ୍ରାଣୀ କୋଷ ତୁଳନା (Plant vs Animal Cell)',
    nameEn: 'Comparison of Plant and Animal Cells',
    prerequisites: ['sci-c5-cell-wall', 'sci-c5-plastids', 'sci-c5-mitochondria'],
  },

  // ==========================================
  // CHAPTER 8: MOTION
  // ==========================================
  {
    id: 'sci-c8-motion-rest',
    subject: 'Science',
    chapter: 'Chapter 8: Motion',
    nameOr: 'ସ୍ଥିତି ଓ ଗତିର ଧାରଣା (Rest and Motion)',
    nameEn: 'Reference Point and Relative Motion',
    prerequisites: [],
  },
  {
    id: 'sci-c8-distance-displacement',
    subject: 'Science',
    chapter: 'Chapter 8: Motion',
    nameOr: 'ଦୂରତା ଓ ବିସ୍ଥାପନ (Distance vs Displacement)',
    nameEn: 'Distance and Displacement (Scalar vs Vector)',
    prerequisites: ['sci-c8-motion-rest'],
  },
  {
    id: 'sci-c8-speed-velocity',
    subject: 'Science',
    chapter: 'Chapter 8: Motion',
    nameOr: 'ଦ୍ରୁତି ଏବଂ ବେଗ (Speed and Velocity)',
    nameEn: 'Speed, Average Speed, and Velocity',
    prerequisites: ['sci-c8-distance-displacement'],
  },
  {
    id: 'sci-c8-acceleration',
    subject: 'Science',
    chapter: 'Chapter 8: Motion',
    nameOr: 'ତ୍ୱରଣ ଓ ମନ୍ଦନ (Acceleration & Retardation)',
    nameEn: 'Rate of Change of Velocity (Acceleration)',
    prerequisites: ['sci-c8-speed-velocity'],
  },
  {
    id: 'sci-c8-uniform-motion',
    subject: 'Science',
    chapter: 'Chapter 8: Motion',
    nameOr: 'ସମଗତି ଓ ଅସମଗତି (Uniform & Non-Uniform Motion)',
    nameEn: 'Uniform and Non-Uniform Motion in a Straight Line',
    prerequisites: ['sci-c8-speed-velocity'],
  },
  {
    id: 'sci-c8-motion-graphs',
    subject: 'Science',
    chapter: 'Chapter 8: Motion',
    nameOr: 'ଦୂରତା-ସମୟ ଓ ବେଗ-ସମୟ ଗ୍ରାଫ୍ (Motion Graphs)',
    nameEn: 'Distance-Time and Velocity-Time Graphs',
    prerequisites: ['sci-c8-distance-displacement', 'sci-c8-acceleration'],
  },
  {
    id: 'sci-c8-equations-of-motion',
    subject: 'Science',
    chapter: 'Chapter 8: Motion',
    nameOr: 'ଗତିଜ ସମୀକରଣ (Equations of Motion: v=u+at, s=ut+½at²)',
    nameEn: 'Derivation and Application of Equations of Motion',
    prerequisites: ['sci-c8-acceleration', 'sci-c8-motion-graphs'],
  },
  {
    id: 'sci-c8-circular-motion',
    subject: 'Science',
    chapter: 'Chapter 8: Motion',
    nameOr: 'ସମ ବୃତ୍ତୀୟ ଗତି (Uniform Circular Motion)',
    nameEn: 'Uniform Circular Motion and Centripetal Acceleration',
    prerequisites: ['sci-c8-equations-of-motion'],
  },
  // ==========================================
  // CHEMISTRY & CHEMICAL REACTIONS
  // ==========================================
  {
    id: 'sci-chem-reactions',
    subject: 'Science',
    chapter: 'Chapter 1: Chemical Reactions & Equations',
    nameOr: 'ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା ଓ ସମୀକରଣ (Chemical Reactions & Equations)',
    nameEn: 'Chemical Reactions, Reactants and Products',
    prerequisites: [],
  },
  {
    id: 'sci-chem-types',
    subject: 'Science',
    chapter: 'Chapter 1: Chemical Reactions & Equations',
    nameOr: 'ରାସାୟନିକ ପ୍ରତିକ୍ରିୟାର ପ୍ରକାରଭେଦ (Types of Chemical Reactions)',
    nameEn: 'Combination, Decomposition, Displacement & Redox Reactions',
    prerequisites: ['sci-chem-reactions'],
  },
  {
    id: 'sci-matter-states',
    subject: 'Science',
    chapter: 'Chapter 1: Matter in Our Surroundings',
    nameOr: 'ପଦାର୍ଥର ଅବସ୍ଥା ଓ ବାଷ୍ପୀଭବନ (States of Matter & Evaporation)',
    nameEn: 'Solid, Liquid, Gas and Evaporation',
    prerequisites: [],
  },
  {
    id: 'sci-atoms-molecules',
    subject: 'Science',
    chapter: 'Chapter 3: Atoms and Molecules',
    nameOr: 'ପରମାଣୁ ଓ ଅଣୁ (Atoms and Molecules)',
    nameEn: 'Atomic Theory, Molecules and Chemical Formulae',
    prerequisites: ['sci-matter-states'],
  },
  {
    id: 'sci-c9-newton-laws',
    subject: 'Science',
    chapter: 'Chapter 9: Force and Laws of Motion',
    nameOr: 'ବଳ ଓ ନିଉଟନଙ୍କ ଗତି ନିୟମ (Force & Newton’s Laws of Motion)',
    nameEn: 'Inertia, Momentum and Newton’s Three Laws of Motion',
    prerequisites: ['sci-c8-speed-velocity', 'sci-c8-acceleration'],
  },
];
