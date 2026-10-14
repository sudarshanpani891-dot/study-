/**
 * MatiSathi Curriculum Knowledge Base
 * Class 9 Odisha State Board (BSE Odisha / SCERT) Curriculum Capsules
 * Regional Context: Rural Odisha (Kandhamal, Koraput, Mayurbhanj, coastal deltas)
 */

import type { CurriculumCapsule, ConceptMastery, StudentProfile } from './types';

export const CLASS_9_CURRICULUM: CurriculumCapsule[] = [
  {
    id: 'sci-cell-biology',
    subject: 'Science',
    chapterOdia: 'ଅଧ୍ୟାୟ ୫: ଜୀବନର ମୌଳିକ ଏକକ (କୋଷ)',
    chapterEnglish: 'Chapter 5: The Fundamental Unit of Life (Cell)',
    topicNameOdia: 'କୋଷ ପ୍ରାଚୀର ଏବଂ କୋଷ ଝିଲ୍ଲୀ',
    topicNameEnglish: 'Cell Wall vs Cell Membrane (Plasma Membrane)',
    summaryOdia:
      'କୋଷ ହେଉଛି ପ୍ରତ୍ୟେକ ଜୀବ ଶରୀରର ମୌଳିକ ଏକକ | ଉଦ୍ଭିଦ କୋଷରେ ବାହାର ଆବରଣକୁ Cell Wall (କୋଷ ପ୍ରାଚୀର) କୁହାଯାଏ, ଯାହା ସେଲ୍ୟୁଲୋଜ୍ (Cellulose) ରେ ତିଆରି ଏବଂ ଦୃଢ଼ ଅଟେ | ପ୍ରାଣୀ ଏବଂ ଉଦ୍ଭିଦ ଉଭୟଙ୍କ ପାଖରେ Cell Membrane (କୋଷ ଝିଲ୍ଲୀ) ଥାଏ, ଯାହା ନରମ ଏବଂ ଅର୍ଦ୍ଧ-ପାରଗମ୍ୟ (semi-permeable) ଅଟେ |',
    keyTerms: [
      {
        odia: 'କୋଷ ପ୍ରାଚୀର',
        english: 'Cell Wall',
        explanationOdia: 'କେବଳ ଉଦ୍ଭିଦ କୋଷରେ ଥାଏ, ଦୃଢ଼ ଆବରଣ ଯାହା କୋଷକୁ ଆକାର ଓ ସୁରକ୍ଷା ଦିଏ |',
      },
      {
        odia: 'କୋଷ ଝିଲ୍ଲୀ',
        english: 'Cell Membrane / Plasma Membrane',
        explanationOdia: 'ପ୍ରାଣୀ ଓ ଉଦ୍ଭିଦ ଉଭୟଙ୍କ ପାଖରେ ଥାଏ; କେବଳ ଦରକାରୀ ପଦାର୍ଥକୁ ଭିତରକୁ ଛାଡ଼େ |',
      },
      {
        odia: 'ମାଇଟୋକଣ୍ଡ୍ରିଆ (ଶକ୍ତି କେନ୍ଦ୍ର)',
        english: 'Mitochondria (Powerhouse of the Cell)',
        explanationOdia: 'କୋଷ ମଧ୍ୟରେ ATP ରୂପରେ ଶକ୍ତି ଉତ୍ପନ୍ନ କରେ, ଯେପରି ଘରେ ଲଣ୍ଠନ ବା ବିଦ୍ୟୁତ୍ ଶକ୍ତି ଯୋଗାଏ |',
      },
      {
        odia: 'କ୍ଲୋରୋପ୍ଲାଷ୍ଟ (ହରିତକଣିକା)',
        english: 'Chloroplast',
        explanationOdia: 'ଉଦ୍ଭିଦ କୋଷରେ ଥାଏ, ଆଲୋକ ଶ୍ଳେଷଣ (Photosynthesis) ଦ୍ୱାରା ଖାଦ୍ୟ ପ୍ରସ୍ତୁତ କରେ |',
      },
    ],
    ruralAnalogy: {
      metaphorTitleOdia: 'ଗାଁ ମାଟି ଘରର ବାହାର କାନ୍ଥ ବନାମ ଜାଲି କବାଟ',
      metaphorTitleEnglish: 'Village Mud Perimeter Wall vs Mesh Screen Door',
      explanationOdia:
        'ତୁମ ଗାଁରେ ମାଟି ଘରର ବାହାରେ ଥିବା ଇଟା ବା ମାଟି କାନ୍ଥ (Boundary Wall) କୁ ଭାବ - ତାହା ହେଉଛି Cell Wall | ତାହା ବର୍ଷା ଓ ପବନରେ ଘରକୁ ସିଧା ଠିଆ କରି ରଖେ | କିନ୍ତୁ ଘର ଭିତରର ଜାଲି କବାଟ (Mesh Door) ହେଉଛି Cell Membrane - ତାହା ଥଣ୍ଡା ପବନ ଓ ମଣିଷଙ୍କୁ ଭିତରକୁ ଛାଡ଼େ, କିନ୍ତୁ ମଶା ଓ ମାଛିକୁ ଅଟକାଏ (Selective barrier) |',
      explanationEnglish:
        'Think of the thick outer mud wall of your village home: that is the Cell Wall providing rigid shape. The inner mesh door is the Cell Membrane: allowing pleasant air in while blocking insects (semi-permeable).',
      localAnchor: 'ଗାଁ ମାଟି କାନ୍ଥ ଓ ଛଣା ଜାଲି (Village Mud Wall & Sieve)',
    },
    commonMisconceptions: [
      {
        confusionOdia: 'ପ୍ରାଣୀ କୋଷରେ ମଧ୍ୟ Cell Wall (କୋଷ ପ୍ରାଚୀର) ଥାଏ |',
        confusionEnglish: 'Animal cells also have cell walls.',
        clarificationOdia:
          'ନାହିଁ! ପ୍ରାଣୀ କୋଷରେ କେବଳ Cell Membrane ଥାଏ | ଉଦ୍ଭିଦ ନିଜେ ଚାଲିପାରେ ନାହିଁ, ତେଣୁ ଝଡ଼-ବର୍ଷାରୁ ବଞ୍ଚିବା ପାଇଁ ତାହାକୁ ଅତିରିକ୍ତ Cell Wall ଦରକାର |',
        clarificationEnglish:
          'No! Animal cells only have a flexible cell membrane. Plants cannot move to find shelter, so they need a rigid cellulose cell wall to withstand storms and osmotic pressure.',
        keywords: ['animal cell', 'wall', 'ପ୍ରାଣୀ', 'ପ୍ରାଚୀର'],
      },
    ],
    examFocusPoints: [
      'Cell Wall is made of Cellulose (ସେଲ୍ୟୁଲୋଜ୍)',
      'Cell Membrane is made of Lipids and Proteins (ଲିପିଡ୍ ଓ ପ୍ରୋଟିନ୍)',
      'Plant cells have both; Animal cells only have Cell Membrane',
      'Mitochondria is called the "Powerhouse of the Cell"',
    ],
  },
  {
    id: 'sci-force-motion',
    subject: 'Science',
    chapterOdia: 'ଅଧ୍ୟାୟ ୯: ବଳ ଏବଂ ଗତିର ନିୟମ',
    chapterEnglish: 'Chapter 9: Force and Laws of Motion',
    topicNameOdia: 'ନ୍ୟୁଟନଙ୍କ ଗତିର ନିୟମ ଓ ଜଡ଼ତା',
    topicNameEnglish: "Newton's Laws of Motion & Inertia",
    summaryOdia:
      'ନ୍ୟୁଟନଙ୍କ ପ୍ରଥମ ନିୟମ (First Law of Motion) ଅନୁସାରେ, ଯଦି କୌଣସି ବାହ୍ୟ ବଳ (External Force) ପ୍ରୟୋଗ ନହୁଏ, ତେବେ ଏକ ସ୍ଥିର ବସ୍ତୁ ସ୍ଥିର ରହେ ଏବଂ ଗତିଶୀଳ ବସ୍ତୁ ସମାନ ବେଗରେ ସରଳ ରେଖାରେ ଚାଲିଥାଏ | ଏହି ଧର୍ମକୁ Inertia (ଜଡ଼ତା) କୁହାଯାଏ | ଘର୍ଷଣ (Friction) ଗତିକୁ ମନ୍ଥର କରିଦିଏ |',
    keyTerms: [
      {
        odia: 'ଜଡ଼ତା',
        english: 'Inertia',
        explanationOdia: 'ନିଜର ଅବସ୍ଥା (ସ୍ଥିର ବା ଗତି) ବଜାୟ ରଖିବା ପାଇଁ ବସ୍ତୁର ପ୍ରବୃତ୍ତି |',
      },
      {
        odia: 'ଘର୍ଷଣ ବଳ',
        english: 'Friction',
        explanationOdia: 'ଦୁଇଟି ପୃଷ୍ଠ ପରସ୍ପର ସଂସ୍ପର୍ଶରେ ଆସିଲେ ଗତିକୁ ପ୍ରତିରୋଧ କରୁଥିବା ବଳ |',
      },
      {
        odia: 'ସଂବେଗ',
        english: 'Momentum (p = m × v)',
        explanationOdia: 'ବସ୍ତୁତ୍ୱ (Mass) ଏବଂ ବେଗ (Velocity) ର ଗୁଣନଫଳ |',
      },
      {
        odia: 'ବାହ୍ୟ ବଳ',
        english: 'Unbalanced External Force',
        explanationOdia: 'ଯେଉଁ ବଳ ବସ୍ତୁର ଗତିର ଦିଗ ବା ବେଗକୁ ବଦଳାଇ ଦିଏ |',
      },
    ],
    ruralAnalogy: {
      metaphorTitleOdia: 'ଗାଁ ବଳଦ ଗାଡ଼ିର ହଠାତ୍ ଅଟକିବା',
      metaphorTitleEnglish: 'Sudden Braking of a Bullock Cart on a Mud Road',
      explanationOdia:
        'ତୁମେ ବଳଦ ଗାଡ଼ି (Bullock Cart) ରେ ବସି ଯାଉଥିବା ବେଳେ ବଳଦ ହଠାତ୍ ରାସ୍ତାରେ ଅଟକିଗଲେ ତୁମେ ଆଗକୁ ଝୁଙ୍କି ପଡ଼ୁ, କାହିଁକି? କାରଣ ତୁମ ଶରୀର ଗତିଶୀଳ ଥିଲା ଏବଂ Inertia (ଗତି ଜଡ଼ତା) ଯୋଗୁଁ ଆଗକୁ ଯିବାକୁ ଚାହୁଁଥିଲା | ସେହିପରି କାଦୁଅ ରାସ୍ତାରେ ଚକ ଚାଲିବା କଷ୍ଟ ହୁଏ କାରଣ Friction (ଘର୍ଷଣ) ବଢ଼ିଯାଏ |',
      explanationEnglish:
        'When riding a bullock cart and the cart stops suddenly, you lurch forward due to Inertia of Motion. On muddy rural tracks, the cart slows down because wet mud exerts higher Friction.',
      localAnchor: 'ବଳଦ ଗାଡ଼ି ଓ କାଦୁଅ ରାସ୍ତା (Bullock Cart on Mud Road)',
    },
    commonMisconceptions: [
      {
        confusionOdia: 'ଗୋଟିଏ ବସ୍ତୁକୁ ଚଳନ୍ତା ରଖିବା ପାଇଁ ସବୁବେଳେ ବଳ (Force) ଲଗାଇବା ଦରକାର |',
        confusionEnglish: 'An object requires continuous force just to stay in motion.',
        clarificationOdia:
          'ଭୁଲ୍! ଯଦି ରାସ୍ତାରେ କୌଣସି Friction (ଘର୍ଷଣ) ନଥାନ୍ତା, ତେବେ ଥରେ ଠେଲି ଦେଲେ ସେହି ବସ୍ତୁ ଅନନ୍ତକାଳ ଯାଏଁ ଚାଲିଥାନ୍ତା | ସାଇକେଲ୍ ଅଟକିଯାଏ କାରଣ ରାସ୍ତା ଓ ବାୟୁର ଘର୍ଷଣ ବଳ ତାକୁ ଅଟକାଏ |',
        clarificationEnglish:
          'Incorrect. In a frictionless environment, an object in motion stays in motion indefinitely without any applied force. On Earth, friction and air resistance bring it to rest.',
        keywords: ['continuous force', 'keep moving', 'ସବୁବେଳେ ବଳ'],
      },
    ],
    examFocusPoints: [
      'Newton’s First Law defines Inertia',
      'Mass is the direct measure of Inertia (More mass = more inertia)',
      'Formula: F = m × a (Force = Mass × Acceleration)',
    ],
  },
  {
    id: 'sci-matter-evaporation',
    subject: 'Science',
    chapterOdia: 'ଅଧ୍ୟାୟ ୧: ଆମ ଚାରିପାଖର ପଦାର୍ଥ',
    chapterEnglish: 'Chapter 1: Matter in Our Surroundings',
    topicNameOdia: 'ବାଷ୍ପୀଭବନ ଓ ମାଟି କଳସୀର ପାଣି',
    topicNameEnglish: 'Evaporation and Latent Heat of Vaporization',
    summaryOdia:
      'ବାଷ୍ପୀଭବନ (Evaporation) ହେଉଛି ଏକ ପୃଷ୍ଠୀୟ ଘଟଣା (surface phenomenon) | ସ୍ଫୁଟନାଙ୍କ (Boiling Point) ଠାରୁ କମ୍ ତାପମାତ୍ରାରେ ତରଳ ପଦାର୍ଥ ଗ୍ୟାସୀୟ ଅବସ୍ଥାକୁ ଯିବାକୁ ବାଷ୍ପୀଭବନ କୁହାଯାଏ | ଏହା ଦ୍ୱାରା ଶୀତଳତା (Cooling effect) ସୃଷ୍ଟି ହୁଏ, କାରଣ ବାଷ୍ପ ହେବା ପାଇଁ କଣିକାଗୁଡ଼ିକ ଆଖପାଖରୁ Latent Heat (ଗୁପ୍ତ ତାପ) ଶୋଷଣ କରନ୍ତି |',
    keyTerms: [
      {
        odia: 'ବାଷ୍ପୀଭବନ',
        english: 'Evaporation',
        explanationOdia: 'ପୃଷ୍ଠଭାଗରୁ ଜଳକଣିକା ବାଷ୍ପ ହୋଇ ଉଡ଼ିଯିବା |',
      },
      {
        odia: 'ସ୍ଫୁଟନ',
        english: 'Boiling',
        explanationOdia: 'ପୁରା ଜଳ ୧୦୦° ସେଲସିଅସରେ ଫୁଟି ବାଷ୍ପ ହେବା (bulk phenomenon) |',
      },
      {
        odia: 'ଗୁପ୍ତ ତାପ',
        english: 'Latent Heat of Vaporization',
        explanationOdia: 'ତାପମାତ୍ରା ନବଦଳାଇ ତରଳରୁ ବାଷ୍ପ ହେବା ପାଇଁ ଆବଶ୍ୟକ ଉତ୍ତାପ |',
      },
    ],
    ruralAnalogy: {
      metaphorTitleOdia: 'ଗ୍ରୀଷ୍ମ ଦିନେ ମାଟି କଳସୀର ପାଣି ଥଣ୍ଡା ରହିବା',
      metaphorTitleEnglish: 'Why Water in an Earthen Pitcher Stays Cold in Summer',
      explanationOdia:
        'ଓଡ଼ିଶାର ବୈଶାଖ ମାସର ପ୍ରଚଣ୍ଡ ଖରାରେ ମଧ୍ୟ ମାଟି କଳସୀ (Surahi / Matka) ଭିତର ପାଣି କାହିଁକି ଥଣ୍ଡା ଲାଗେ? କାରଣ ମାଟି କଳସୀ ଦେହରେ ଅସଂଖ୍ୟ ଅଦୃଶ୍ୟ ଛୋଟ ଛୋଟ କଣା (pores) ଥାଏ | ସେଥିରୁ ପାଣି ବାହାରକୁ ଝରି Evaporation (ବାଷ୍ପୀଭବନ) ହୁଏ | ଏହି ବାଷ୍ପ ହେବା ପାଇଁ ସେହି ପାଣି ଭିତରୁ Latent Heat (ତାପ) ଟାଣିନିଏ, ଫଳରେ ଭିତର ପାଣି ବରଫ ପରି ଥଣ୍ଡା ରହେ!',
      explanationEnglish:
        'In scorching Odisha summers, water inside an earthen pitcher stays cool because water seeps through microscopic clay pores and evaporates, extracting latent heat from the remaining water.',
      localAnchor: 'ମାଟି କଳସୀ ଓ ଗ୍ରୀଷ୍ମ ଖରା (Clay Pitcher & Summer Cooling)',
    },
    commonMisconceptions: [
      {
        confusionOdia: 'ବାଷ୍ପୀଭବନ କେବଳ ୧୦୦°C ତାପମାତ୍ରାରେ ହିଁ ହୁଏ |',
        confusionEnglish: 'Evaporation only happens at 100°C.',
        clarificationOdia:
          'ଭୁଲ୍! ୧୦୦°C ରେ Boiling (ସ୍ଫୁଟନ) ହୁଏ | କିନ୍ତୁ Evaporation (ବାଷ୍ପୀଭବନ) ଯେକୌଣସି ସାଧାରଣ ତାପମାତ୍ରାରେ (ଯେପରିକି ଚଟାଣରେ ପଡ଼ିଥିବା ପାଣି ଶୁଖିଯିବା) ଘଟିପାରେ |',
        clarificationEnglish:
          'False! 100°C is the boiling point. Evaporation occurs at any temperature below boiling point, solely at the liquid surface.',
        keywords: ['100 degrees', 'boiling vs evaporation', '୧୦୦ ଡିଗ୍ରୀ'],
      },
    ],
    examFocusPoints: [
      'Evaporation causes cooling (ବାଷ୍ପୀଭବନ ଶୀତଳତା ସୃଷ୍ଟି କରେ)',
      'Factors affecting Evaporation: Surface area, Temperature, Humidity, Wind speed',
      'Difference between Evaporation (surface phenomenon) and Boiling (bulk phenomenon)',
    ],
  },
  {
    id: 'geo-odisha-rivers',
    subject: 'Geography',
    chapterOdia: 'ଅଧ୍ୟାୟ ୩: ଓଡ଼ିଶାର ଜଳସମ୍ପଦ ଓ ନଦୀ ପ୍ରଣାଳୀ',
    chapterEnglish: 'Chapter 3: Odisha Drainage & River Systems',
    topicNameOdia: 'ମହାନଦୀ ପ୍ରଣାଳୀ, ହୀରାକୁଦ ଓ ଚିଲିକା ହ୍ରଦ',
    topicNameEnglish: 'Mahanadi Basin, Hirakud Dam & Chilika Lagoon',
    summaryOdia:
      'ମହାନଦୀ ହେଉଛି ଓଡ଼ିଶାର ପ୍ରମୁଖ ଜୀବନରେଖା (Lifeline of Odisha) | ଏହା ଛତିଶଗଡ଼ର ସିହାୱା ପର୍ବତରୁ ବାହାରି ଓଡ଼ିଶାରେ ସମ୍ବଲପୁର, ସୁବର୍ଣ୍ଣପୁର, କଟକ ଦେଇ ବଙ୍ଗୋପସାଗରରେ ପଡ଼ିଛି | ସମ୍ବଲପୁର ନିକଟରେ ବିଶ୍ୱର ସର୍ବବୃହତ୍ ମାଟିବନ୍ଧ ହୀରାକୁଦ (Hirakud Dam) ନିର୍ମିତ | କଟକର ନରାଜ ନିକଟରେ ଏହା କାଠଯୋଡ଼ି ଓ ବିରୂପା ଶାଖାରେ ବିଭକ୍ତ ହୋଇ ବିସ୍ତୃତ ତ୍ରିକୋଣଭୂମି (Delta) ଗଠନ କରିଛି | ଦକ୍ଷିଣରେ ଚିଲିକା ହ୍ରଦ ଏକ ଖାରିଆ ଜଳ ହ୍ରଦ (Brackish lagoon) ଅଟେ |',
    keyTerms: [
      {
        odia: 'ମହାନଦୀ',
        english: 'Mahanadi River',
        explanationOdia: 'ଓଡ଼ିଶାର ଦୀର୍ଘତମ ନଦୀ (ପ୍ରାୟ ୮୫୮ କିମି ମୋଟ ଦୈର୍ଘ୍ୟ) |',
      },
      {
        odia: 'ଉପନଦୀ',
        english: 'Tributaries (Tel, Ib, Ong)',
        explanationOdia: 'ଯେଉଁ ଛୋଟ ନଦୀଗୁଡ଼ିକ ମୁଖ୍ୟ ନଦୀରେ ମିଶନ୍ତି (ତେଲ ନଦୀ, ଇବ୍ ନଦୀ) |',
      },
      {
        odia: 'ଶାଖା ନଦୀ',
        english: 'Distributaries (Kathajodi, Birupa, Kuakhai)',
        explanationOdia: 'ତ୍ରିକୋଣଭୂମିରେ ମୁଖ୍ୟ ନଦୀରୁ ବାହାରି ସମୁଦ୍ର ଆଡ଼କୁ ବହୁଥିବା ନଦୀ |',
      },
      {
        odia: 'ଚିଲିକା ହ୍ରଦ',
        english: 'Chilika Lake (Brackish Water Lagoon)',
        explanationOdia: 'ଏସିଆର ସର୍ବବୃହତ୍ ଖାରିଆ ଜଳ ହ୍ରଦ, ଯେଉଁଠି ମଧୁର ନଦୀ ଜଳ ଓ ସମୁଦ୍ର ଲୁଣି ପାଣି ମିଶେ |',
      },
    ],
    ruralAnalogy: {
      metaphorTitleOdia: 'ନଦୀ ଯେପରି ଗାଁର ମୁଖ୍ୟ ରାସ୍ତା ଓ ଚାଷ ଜମିର କେନାଲ',
      metaphorTitleEnglish: 'River System as Village Trunk Road and Field Channels',
      explanationOdia:
        'ଭାବ ଯେପରି ତୁମ ଅଞ୍ଚଳର ମୁଖ୍ୟ ରାସ୍ତାରେ ଆଖପାଖ ଜଙ୍ଗଲ ଓ ଗାଁର ଛୋଟ ପାଦଚଲା ରାସ୍ତା ମିଶୁଛନ୍ତି - ସେମାନେ ହେଉଛନ୍ତି Tributaries (ଉପନଦୀ: ତେଲ, ଇବ୍) | କିନ୍ତୁ କଟକ ନରାଜ ପାଖରେ ପହଞ୍ଚିଲା ପରେ ସେହି ବଡ଼ ରାସ୍ତା ଯେପରି ଚାଷ ଜମିକୁ ପାଣି ଦେବା ପାଇଁ ଶହ ଶହ ଛୋଟ କେନାଲରେ ବାଣ୍ଟିହୋଇଯାଏ, ସେମାନେ ହେଉଛନ୍ତି Distributaries (ଶାଖା ନଦୀ) | ଏହି ପଟୁମାଟି (Alluvium) ଯୋଗୁଁ ଉପକୂଳ ଜିଲ୍ଲାରେ ଭଲ ଧାନ ଚାଷ ହୁଏ |',
      explanationEnglish:
        'Think of the river as the main regional trunk road where feeder paths merge (Tributaries like Tel and Ib), which then fans out into agricultural irrigation canals across coastal plains (Distributaries like Kathajodi), depositing fertile silt for paddy fields.',
      localAnchor: 'ହୀରାକୁଦ, କଟକ ନରାଜ ଓ ଧାନ ଚାଷ ଜମି (Hirakud, Naraj & Paddy Belts)',
    },
    commonMisconceptions: [
      {
        confusionOdia: 'ଚିଲିକା ହ୍ରଦ ଏକ ମଧୁର ଜଳ (Freshwater) ହ୍ରଦ |',
        confusionEnglish: 'Chilika is a purely freshwater lake.',
        clarificationOdia:
          'ଭୁଲ୍! ଚିଲିକା ଏକ ଖାରିଆ ଜଳ ହ୍ରଦ (Brackish water lagoon) | ଏଥିରେ ଦୟା ଓ ଭାର୍ଗବୀ ନଦୀର ମଧୁର ଜଳ ମିଶେ ଏବଂ ଅରଖକୁଦା ନିକଟରେ ବଙ୍ଗୋପସାଗରର ଲୁଣି ଜଳ ପ୍ରବେଶ କରେ |',
        clarificationEnglish:
          'False! Chilika is Asia’s largest brackish lagoon, receiving freshwater from Daya/Bhargavi rivers and tidal saline water from the Bay of Bengal.',
        keywords: ['freshwater', 'chilika', 'ମଧୁର ଜଳ', 'ଚିଲିକା'],
      },
    ],
    examFocusPoints: [
      'Origin of Mahanadi: Sihawa hills in Dhamtari, Chhattisgarh',
      'Hirakud Dam on Mahanadi near Sambalpur is one of the longest earthen dams in the world',
      'Major Tributaries: Seonath, Hasdeo, Mand, Ib, Ong, Jonk, Tel',
      'Distributaries at delta: Kathajodi, Birupa, Kuakhai, Devi',
    ],
  },
  {
    id: 'geo-odisha-climate',
    subject: 'Geography',
    chapterOdia: 'ଅଧ୍ୟାୟ ୪: ଓଡ଼ିଶାର ଜଳବାୟୁ ଓ ମୌସୁମୀ',
    chapterEnglish: 'Chapter 4: Climate and Monsoon in Odisha',
    topicNameOdia: 'ଦକ୍ଷିଣ-ପଶ୍ଚିମ ମୌସୁମୀ ବାୟୁ ଓ କାଳବୈଶାଖୀ',
    topicNameEnglish: 'South-West Monsoon & Nor’westers (Kalbaisakhi)',
    summaryOdia:
      'ଓଡ଼ିଶାର ଜଳବାୟୁ ହେଉଛି କ୍ରାନ୍ତୀୟ ମୌସୁମୀ ଜଳବାୟୁ (Tropical Monsoon Climate) | ଜୁନ୍ ମାସ ଦ୍ୱିତୀୟ ସପ୍ତାହରେ ଦକ୍ଷିଣ-ପଶ୍ଚିମ ମୌସୁମୀ ବାୟୁ (South-West Monsoon) ର ବଙ୍ଗୋପସାଗରୀୟ ଶାଖା ଓଡ଼ିଶାରେ ପ୍ରବେଶ କରି ପ୍ରଚୁର ବୃଷ୍ଟିପାତ କରାଏ | ବୈଶାଖ ମାସରେ ପ୍ରବଳ ଝଡ଼ବର୍ଷା ହୁଏ, ଯାହାକୁ କାଳବୈଶାଖୀ (Kalbaisakhi / Nor’westers) କୁହାଯାଏ | ଅକ୍ଟୋବର-ନଭେମ୍ବରରେ ବଙ୍ଗୋପସାଗରରେ ସୃଷ୍ଟ ଲଘୁଚାପ ଯୋଗୁଁ ବାତ୍ୟା (Cyclone) ଆସେ |',
    keyTerms: [
      {
        odia: 'ଦକ୍ଷିଣ-ପଶ୍ଚିମ ମୌସୁମୀ ବାୟୁ',
        english: 'South-West Monsoon',
        explanationOdia: 'ଜୁନ୍ ରୁ ସେପ୍ଟେମ୍ବର ମଧ୍ୟରେ ଓଡ଼ିଶାର ପ୍ରାୟ ୮୦% ବର୍ଷା ପ୍ରଦାନ କରେ |',
      },
      {
        odia: 'କାଳବୈଶାଖୀ',
        english: 'Kalbaisakhi / Nor’westers',
        explanationOdia: 'ଗ୍ରୀଷ୍ମ ଋତୁର ଅପରାହ୍ନରେ ହେଉଥିବା ବଜ୍ରପାତ ସହ ଝଡ଼ବର୍ଷା |',
      },
      {
        odia: 'ଲଘୁଚାପ ଓ ବାତ୍ୟା',
        english: 'Depression & Tropical Cyclone',
        explanationOdia: 'ବଙ୍ଗୋପସାଗରରେ କେନ୍ଦ୍ରୀଭୂତ କମ୍ ଚାପ କାରଣରୁ ଉପକୂଳରେ ଭୀଷଣ ପବନ ଓ ବର୍ଷା |',
      },
    ],
    ruralAnalogy: {
      metaphorTitleOdia: 'ରଜ ପର୍ବ ଓ ଚାଷୀର ମୌସୁମୀ ଅପେକ୍ଷା',
      metaphorTitleEnglish: 'Raja Festival and the Farmer Waiting for Monsoons',
      explanationOdia:
        'ଓଡ଼ିଶାରେ ରଜ ପର୍ବ ସମୟରେ ଚାଷୀମାନେ ଆକାଶକୁ ଚାହିଁ ରହନ୍ତି | କାରଣ ସେହି ସମୟରେ South-West Monsoon ବଙ୍ଗୋପସାଗରରୁ ଓଦା ବାଦଲ ଆଣି ପାହାଡ଼ିଆ କୋରାପୁଟ, କନ୍ଧମାଳ ଏବଂ ସମଗ୍ର ଓଡ଼ିଶାକୁ ଭିଜାଇ ଦିଏ, ଯାହାଦ୍ୱାରା ଧାନ ବୁଣା କାର୍ଯ୍ୟ (Akshaya Tritiya & Raja sowing) ଆରମ୍ଭ ହୁଏ |',
      explanationEnglish:
        'During Odisha’s traditional Raja festival, rural farming families look to the sky for the arrival of the South-West Monsoon bearing rain clouds from the Bay of Bengal to nurture the soil for sowing season.',
      localAnchor: 'ରଜ ପର୍ବ ଓ ପ୍ରଥମ ମୌସୁମୀ ବର୍ଷା (Raja Festival & Monsoon)',
    },
    commonMisconceptions: [
      {
        confusionOdia: 'ଓଡ଼ିଶାରେ ସବୁଠାରୁ ଅଧିକ ବର୍ଷା ଶୀତ ଋତୁରେ ହୁଏ |',
        confusionEnglish: 'Odisha receives maximum rainfall in winter.',
        clarificationOdia:
          'ଭୁଲ୍! ଓଡ଼ିଶାର ୮୦% ରୁ ଅଧିକ ବର୍ଷା ଜୁନ୍ ରୁ ସେପ୍ଟେମ୍ବର ମଧ୍ୟରେ ଦକ୍ଷିଣ-ପଶ୍ଚିମ ମୌସୁମୀ ବାୟୁ ଦ୍ୱାରା ଘଟିଥାଏ |',
        clarificationEnglish:
          'False! Over 80% of rainfall arrives between June and September via the South-West Monsoon.',
        keywords: ['winter rainfall', 'ଶୀତ ଦିନେ ବର୍ଷା'],
      },
    ],
    examFocusPoints: [
      'Normal arrival of Monsoon in Odisha: Around June 10–15',
      'Average annual rainfall in Odisha is approximately 1450 mm',
      'Koraput, Kandhamal, and Mayurbhanj receive high orographic rainfall',
    ],
  },
];

export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  id: 'learner-profile-default',
  name: 'ସାଥୀ (Learner)',
  nameOdia: 'ସାଥୀ (Learner)',
  grade: 'Class 9 / ନବମ ଶ୍ରେଣୀ',
  learningGoal: 'Autonomous Mastery across Science, Math & Tech',
  school: 'Odisha Board (BSE)',
  district: 'Odisha',
  motherTongue: 'Odia / Indic (ଓଡ଼ିଆ)',
  mediumOfInstruction: 'Bilingual (Odia + English)',
  eveningStudyMinutesRemaining: 60,
  lowDataMode: true,
  lastActiveDate: new Date().toISOString(),
};

export const INITIAL_MASTERY_STATE: Record<string, ConceptMastery> = {
  'sci-cell-biology': {
    conceptId: 'sci-cell-biology',
    subject: 'Science',
    chapter: 'ଅଧ୍ୟାୟ ୫: ଜୀବନର ମୌଳିକ ଏକକ',
    topicNameOdia: 'କୋଷ ପ୍ରାଚୀର ଏବଂ କୋଷ ଝିଲ୍ଲୀ',
    topicNameEnglish: 'Cell Wall vs Cell Membrane',
    masteryScore: 42,
    totalDoubtsAsked: 3,
    lastStudiedAt: '2026-10-12T19:30:00.000Z',
    activeMisconceptions: ['Confusing animal cell with having a rigid cell wall'],
    status: 'needs_remedial',
  },
  'sci-force-motion': {
    conceptId: 'sci-force-motion',
    subject: 'Science',
    chapter: 'ଅଧ୍ୟାୟ ୯: ବଳ ଏବଂ ଗତିର ନିୟମ',
    topicNameOdia: 'ନ୍ୟୁଟନଙ୍କ ଗତିର ନିୟମ ଓ ଜଡ଼ତା',
    topicNameEnglish: "Newton's Laws of Motion & Inertia",
    masteryScore: 68,
    totalDoubtsAsked: 2,
    lastStudiedAt: '2026-10-11T19:15:00.000Z',
    activeMisconceptions: [],
    status: 'in_progress',
  },
  'sci-matter-evaporation': {
    conceptId: 'sci-matter-evaporation',
    subject: 'Science',
    chapter: 'ଅଧ୍ୟାୟ ୧: ଆମ ଚାରିପାଖର ପଦାର୍ଥ',
    topicNameOdia: 'ବାଷ୍ପୀଭବନ ଓ ମାଟି କଳସୀର ପାଣି',
    topicNameEnglish: 'Evaporation and Latent Heat',
    masteryScore: 55,
    totalDoubtsAsked: 1,
    lastStudiedAt: '2026-10-10T19:40:00.000Z',
    activeMisconceptions: ['Thinking evaporation requires 100°C boiling temperature'],
    status: 'in_progress',
  },
  'geo-odisha-rivers': {
    conceptId: 'geo-odisha-rivers',
    subject: 'Geography',
    chapter: 'ଅଧ୍ୟାୟ ୩: ଓଡ଼ିଶାର ଜଳସମ୍ପଦ ଓ ନଦୀ ପ୍ରଣାଳୀ',
    topicNameOdia: 'ମହାନଦୀ ପ୍ରଣାଳୀ, ହୀରାକୁଦ ଓ ଚିଲିକା',
    topicNameEnglish: 'Mahanadi Basin & Chilika Lagoon',
    masteryScore: 78,
    totalDoubtsAsked: 4,
    lastStudiedAt: '2026-10-09T19:20:00.000Z',
    activeMisconceptions: [],
    status: 'mastered',
  },
  'geo-odisha-climate': {
    conceptId: 'geo-odisha-climate',
    subject: 'Geography',
    chapter: 'ଅଧ୍ୟାୟ ୪: ଓଡ଼ିଶାର ଜଳବାୟୁ ଓ ମୌସୁମୀ',
    topicNameOdia: 'ଦକ୍ଷିଣ-ପଶ୍ଚିମ ମୌସୁମୀ ବାୟୁ ଓ କାଳବୈଶାଖୀ',
    topicNameEnglish: 'Monsoon and Kalbaisakhi',
    masteryScore: 35,
    totalDoubtsAsked: 1,
    lastStudiedAt: '2026-10-08T19:10:00.000Z',
    activeMisconceptions: ['Confusing winter rains with monsoon'],
    status: 'needs_remedial',
  },
};
