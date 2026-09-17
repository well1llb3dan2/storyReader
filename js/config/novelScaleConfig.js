/**
 * The Architecture of Narrative: Novel Genres & Structural Design Matrix
 * Full taxonomy of novel genres with reading styles, optimal word counts,
 * chapter counts, and structural rationales.
 */

export const NOVEL_GENRES_DATA = {
  metadata: {
    title: "The Architecture of Narrative: Novel Genres & Structural Design (Extended)",
    description: "An extensive categorization of novel genres, detailing optimal word count, chapter count, and the structural rationale explaining why that format supports the genre's narrative needs and reading experience.",
    units: {
      word_count: "Approximate Total Words",
      chapter_count: "Approximate Number of Chapters"
    },
    reading_styles_key: {
      "Cozy Fiction": "Snackable Satisfaction / Low Commitment",
      "Contemporary Romance": "Standard / Emotional Pacing",
      "Young Adult (YA)": "Accessible / Fast-Moving",
      "High-Concept Thriller": "Pacing / Suspense Driven",
      "Urban/Paranormal Fantasy": "Action / High Intensity",
      "Literary Fiction": "Reflective / Meditative",
      "Science Fiction": "Complex World-Building / Exposition",
      "Epic/High Fantasy": "Deep Dive / Massive Commitment",
      "LitRPG/GameLit": "Interactive / Meta-Focused",
      "Historical Fiction": "Rich Detail / Character Depth",
      "Horror": "Atmospheric / Dread",
      "Military Fiction": "Logistical / High Stakes",
      "Dystopian Fiction": "Social Commentary / World Erosion",
      "Cozy Mystery": "Local Focused / Gentle Pace",
      "Satire/Comedy": "Episodic / High Contrast",
      "Romantic Suspense": "Tension Blend / Milestone Driven",
      "Cyberpunk": "Gritty / Velocity & Density",
      "Speculative Fiction": "Conceptual / Philosophical"
    }
  },
  novel_genres: [
    {
      id: "cozy_fiction",
      genre: "Cozy Fiction / Slice-of-Life",
      reading_style: "Snackable Satisfaction / Low Commitment",
      avg_total_words: "65,000 – 80,000",
      min_words: 65000,
      max_words: 80000,
      avg_chapter_count: "20 – 28",
      min_chapters: 20,
      max_chapters: 28,
      default_chapters: 24,
      default_words: 72000,
      structural_rationale: "The lower word count provides a quick emotional arc, while the medium chapter count allows the reader to easily stop and resume without losing the thread of the minor conflict. Perfect for a weekday read."
    },
    {
      id: "contemporary_romance",
      genre: "Contemporary Romance / Women's Fiction",
      reading_style: "Standard / Emotional Pacing",
      avg_total_words: "85,000 – 110,000",
      min_words: 85000,
      max_words: 110000,
      avg_chapter_count: "35 – 45",
      min_chapters: 35,
      max_chapters: 45,
      default_chapters: 40,
      default_words: 95000,
      structural_rationale: "This setup allows for steady, granular character development. Each chapter often focuses on a specific milestone in the relationship (a date, a conflict, a breakthrough), building reliable romantic tension."
    },
    {
      id: "young_adult",
      genre: "Young Adult (YA)",
      reading_style: "Accessible / Fast-Moving",
      avg_total_words: "75,000 – 90,000",
      min_words: 75000,
      max_words: 90000,
      avg_chapter_count: "30 – 38",
      min_chapters: 30,
      max_chapters: 38,
      default_chapters: 34,
      default_words: 82000,
      structural_rationale: "YA needs high velocity. The slightly shorter word count and high chapter count ensure that the narrative pace never dips, matching the constant emotional and social upheaval of the protagonist's life."
    },
    {
      id: "thriller_mystery",
      genre: "High-Concept Thriller / Mystery",
      reading_style: "Pacing / Suspense Driven",
      avg_total_words: "90,000 – 105,000",
      min_words: 90000,
      max_words: 105000,
      avg_chapter_count: "30 – 35",
      min_chapters: 30,
      max_chapters: 35,
      default_chapters: 32,
      default_words: 98000,
      structural_rationale: "Chapters are often engineered around a critical moment—a clue found, a witness interrogated, a sudden shift in perspective. This constant structural payoff keeps the reader hooked and guessing."
    },
    {
      id: "urban_fantasy",
      genre: "Urban / Paranormal Fantasy",
      reading_style: "Action / High Intensity",
      avg_total_words: "100,000 – 125,000",
      min_words: 100000,
      max_words: 125000,
      avg_chapter_count: "38 – 48",
      min_chapters: 38,
      max_chapters: 48,
      default_chapters: 42,
      default_words: 110000,
      structural_rationale: "These novels blend mundane and magical worlds. Chapters often serve as transitional moments—a shift from a bustling coffee shop scene to a hidden magical portal—giving the reader brief respites between intense action sequences."
    },
    {
      id: "literary_fiction",
      genre: "Literary Fiction",
      reading_style: "Reflective / Meditative",
      avg_total_words: "95,000 – 135,000",
      min_words: 95000,
      max_words: 135000,
      avg_chapter_count: "20 – 30",
      min_chapters: 20,
      max_chapters: 30,
      default_chapters: 25,
      default_words: 115000,
      structural_rationale: "Chapter count is often less about plot breaks and more about *tonal* shifts. A short chapter might signify a moment of deep, profound reflection; a longer chapter can be an immersive dive into internal monologue."
    },
    {
      id: "sci_fi",
      genre: "Science Fiction (Hard SF / Space Opera)",
      reading_style: "Complex World-Building / Exposition",
      avg_total_words: "120,000 – 160,000",
      min_words: 120000,
      max_words: 160000,
      avg_chapter_count: "45 – 60",
      min_chapters: 45,
      max_chapters: 60,
      default_chapters: 50,
      default_words: 140000,
      structural_rationale: "Due to the complexity of technology, political systems, and planetary rules, chapters frequently serve as anchors, introducing a new planet, a new faction, or a new scientific concept, preventing the reader from becoming overwhelmed."
    },
    {
      id: "epic_fantasy",
      genre: "Epic / High Fantasy",
      reading_style: "Deep Dive / Massive Commitment",
      avg_total_words: "140,000 – 200,000+",
      min_words: 140000,
      max_words: 220000,
      avg_chapter_count: "50 – 70+",
      min_chapters: 50,
      max_chapters: 75,
      default_chapters: 60,
      default_words: 175000,
      structural_rationale: "Chapters in Epic Fantasy often signify major, irreversible plot shifts: the siege begins, the ancient prophecy is fulfilled, the betrayal occurs. They act as large signposts on a massive, multi-year journey."
    },
    {
      id: "litrpg",
      genre: "LitRPG / GameLit",
      reading_style: "Interactive / Meta-Focused",
      avg_total_words: "80,000 – 120,000",
      min_words: 80000,
      max_words: 120000,
      avg_chapter_count: "35 – 50",
      min_chapters: 35,
      max_chapters: 50,
      default_chapters: 42,
      default_words: 100000,
      structural_rationale: "The genre *is* progress. Chapters are frequently tied to measurable events: 'Level Up!' 'Completed Quest: Fetch the Artifact,' or 'Entered Zone 7.' The structure mirrors the reader’s inherent desire to see the character gain measurable power."
    },
    {
      id: "historical_fiction",
      genre: "Historical Fiction",
      reading_style: "Rich Detail / Character Depth",
      avg_total_words: "110,000 – 140,000",
      min_words: 110000,
      max_words: 140000,
      avg_chapter_count: "30 – 40",
      min_chapters: 30,
      max_chapters: 40,
      default_chapters: 35,
      default_words: 125000,
      structural_rationale: "This structure balances the necessity of deep world-building (historical accuracy, social rules) with the needs of character motivation. Chapters often align with calendar dates, seasonal changes, or social events within the historical setting."
    },
    {
      id: "horror",
      genre: "Horror (Psychological / Cosmic)",
      reading_style: "Atmospheric / Dread",
      avg_total_words: "80,000 – 115,000",
      min_words: 80000,
      max_words: 115000,
      avg_chapter_count: "25 – 35",
      min_chapters: 25,
      max_chapters: 35,
      default_chapters: 30,
      default_words: 95000,
      structural_rationale: "Psychological horror uses measured tension. Shorter chapters allow the atmosphere to be fully saturated, whereas longer chapters can be used to slowly unspool the protagonist's internal dread."
    },
    {
      id: "military_fiction",
      genre: "Military Fiction",
      reading_style: "Logistical / High Stakes",
      avg_total_words: "115,000 – 150,000",
      min_words: 115000,
      max_words: 150000,
      avg_chapter_count: "35 – 50",
      min_chapters: 35,
      max_chapters: 50,
      default_chapters: 42,
      default_words: 130000,
      structural_rationale: "The narrative requires constant shifts between macro-level conflict (battles, strategy) and micro-level experience (individual soldiers' dread, small unit interactions). Chapters often demarcate a change of front, a command decision, or a grueling patrol."
    },
    {
      id: "dystopian",
      genre: "Dystopian Fiction",
      reading_style: "Social Commentary / World Erosion",
      avg_total_words: "95,000 – 120,000",
      min_words: 95000,
      max_words: 120000,
      avg_chapter_count: "30 – 40",
      min_chapters: 30,
      max_chapters: 40,
      default_chapters: 35,
      default_words: 105000,
      structural_rationale: "The narrative is often built around the protagonist’s discovery of the system's flaw. Chapters frequently mark a progressive step toward forbidden knowledge or rebellion, showing the gradual *erosion* of the societal control."
    },
    {
      id: "cozy_mystery",
      genre: "Cozy Mystery",
      reading_style: "Local Focused / Gentle Pace",
      avg_total_words: "60,000 – 90,000",
      min_words: 60000,
      max_words: 90000,
      avg_chapter_count: "25 – 35",
      min_chapters: 25,
      max_chapters: 35,
      default_chapters: 28,
      default_words: 75000,
      structural_rationale: "The lower word count keeps the setting contained (a town, a village). Chapters are perfectly sized to introduce a new suspect, a piece of evidence, or a minor red herring, ensuring the slow, satisfying buildup of the local investigation."
    },
    {
      id: "satire_comedy",
      genre: "Satire / Comedy",
      reading_style: "Episodic / High Contrast",
      avg_total_words: "80,000 – 110,000",
      min_words: 80000,
      max_words: 110000,
      avg_chapter_count: "35 – 45",
      min_chapters: 35,
      max_chapters: 45,
      default_chapters: 38,
      default_words: 92000,
      structural_rationale: "The structure needs enough meat to build a world, but frequent chapter breaks allow for comedic resets and tonal shifts. Each chapter can represent a new failure, a ridiculous character interaction, or a new absurdity."
    },
    {
      id: "romantic_suspense",
      genre: "Romantic Suspense",
      reading_style: "Tension Blend / Milestone Driven",
      avg_total_words: "100,000 – 130,000",
      min_words: 100000,
      max_words: 130000,
      avg_chapter_count: "38 – 50",
      min_chapters: 38,
      max_chapters: 50,
      default_chapters: 44,
      default_words: 115000,
      structural_rationale: "This genre demands dual pacing. Chapters must deliver the emotional beat (The connection grew stronger!) while simultaneously raising the stakes (The killer is closer!). They act as clear markers for plot breakthroughs AND relationship milestones."
    },
    {
      id: "cyberpunk",
      genre: "Cyberpunk",
      reading_style: "Gritty / Velocity & Density",
      avg_total_words: "120,000 – 160,000",
      min_words: 120000,
      max_words: 160000,
      avg_chapter_count: "40 – 60",
      min_chapters: 40,
      max_chapters: 60,
      default_chapters: 48,
      default_words: 135000,
      structural_rationale: "The world is too saturated and fast-moving to be contained in few chapters. Short, dense chapters mimic the experience of navigating a neon-soaked, chaotic metropolis—you are always moving, always encountering new interfaces, and always fighting for survival."
    },
    {
      id: "speculative_fiction",
      genre: "Speculative Fiction",
      reading_style: "Conceptual / Philosophical",
      avg_total_words: "100,000 – 140,000",
      min_words: 100000,
      max_words: 140000,
      avg_chapter_count: "25 – 35",
      min_chapters: 25,
      max_chapters: 35,
      default_chapters: 30,
      default_words: 118000,
      structural_rationale: "The focus is often less on 'who did it' and more on 'what does this mean?' Chapters are designed to introduce a single, powerful conceptual premise (e.g., time is cyclical, consciousness is outsourced) and then explore that premise thoroughly before moving to the next idea."
    }
  ]
};

export const READING_LEVELS = [
  {
    id: "middle_grade",
    label: "Middle Grade (Ages 8–12)",
    grade: "Grades 4–7",
    description: "Clear, direct vocabulary, energetic pacing, vivid sensory language, and accessible sentence structure. Focuses on immediate action, clear emotional stakes, and heartfelt themes without overly dense syntax.",
    vocabularyNote: "Clear, engaging language; avoids archaic terms; prioritizes direct sensory phrasing and strong verbs.",
    syntaxNote: "Crisp, varied simple and compound sentences; avoids multi-clause convoluted sentences.",
    thematicNote: "Action-oriented, empathetic, wonder, adventure, personal discovery, relatable youth dynamics."
  },
  {
    id: "young_adult",
    label: "Young Adult (YA / Teens)",
    grade: "Grades 8–10",
    description: "Fast-moving, emotionally charged prose with sharp, authentic dialogue, dynamic interiority, and contemporary pacing. Balances accessibility with sophisticated emotional conflict and high stakes.",
    vocabularyNote: "Modern, expressive vocabulary; punchy, evocative descriptions; sharp dialogue.",
    syntaxNote: "Dynamic rhythm; uses fragments and staccato cadence during tension; fluid transitions.",
    thematicNote: "Identity, high-stakes decisions, intense social/emotional upheaval, romance, independence, rebellion."
  },
  {
    id: "general_commercial",
    label: "Commercial Bestseller / Accessible Adult",
    grade: "General Adult",
    description: "The standard for modern commercial fiction (thrillers, romance, sci-fi, popular mystery). Propulsive narrative momentum, polished prose, engaging dialogue, and seamless readability that pulls the reader through every page.",
    vocabularyNote: "Rich, natural vocabulary; precise atmospheric terms; zero unnecessary jargon or filler.",
    syntaxNote: "Balanced, melodic sentence variety; effortless narrative flow designed for unputdownable readability.",
    thematicNote: "Compelling external conflicts, multi-dimensional character motivations, high entertainment value."
  },
  {
    id: "literary_advanced",
    label: "Literary / Advanced Fiction",
    grade: "Advanced / Scholarly",
    description: "Elevated, evocative literary prose featuring nuanced psychological depth, lyrical sentence construction, subtle metaphor, and rich atmospheric layering. Prized for artistic resonance and deep interiority.",
    vocabularyNote: "Sophisticated, nuanced diction; evocative and poetic imagery; multi-layered subtext.",
    syntaxNote: "Complex, cadenced sentence structures; flowing periodic sentences; rhythmic, contemplative pacing.",
    thematicNote: "Philosophical inquiries, subtle moral ambiguities, psychological realism, existential depth."
  },
  {
    id: "academic_dense",
    label: "Academic / Classical Dense",
    grade: "Classical / Erudite",
    description: "Highly intricate, classical or erudite prose style reminiscent of 19th-century masters or dense speculative philosophy. Characterized by elaborate syntactic structures, deep thematic exploration, and formal rhetorical precision.",
    vocabularyNote: "Extensive, erudite vocabulary; formal or period-authentic phrasing; rigorous conceptual precision.",
    syntaxNote: "Intricate, multi-layered compound-complex sentences; expansive descriptive paragraphs and formal rhetorical cadence.",
    thematicNote: "Historical rigor, epistemological themes, deep sociological commentary, grand structural scale."
  }
];

export function getReadingLevelById(id) {
  return READING_LEVELS.find(r => r.id === id) || READING_LEVELS[2]; // Default to general_commercial
}
export function getNovelRecommendation(chapterCount, totalWordCount, selectedGenreId = null) {
  const chapters = Math.max(3, Math.min(144, parseInt(chapterCount, 10) || 20));
  const totalWords = Math.max(1000, Math.min(400000, parseInt(totalWordCount, 10) || 50000));
  const wordsPerChapter = Math.round(totalWords / chapters);

  // Match or find genre alignment
  let matchedGenre = null;
  if (selectedGenreId) {
    matchedGenre = NOVEL_GENRES_DATA.novel_genres.find(g => g.id === selectedGenreId);
  }
  if (!matchedGenre) {
    matchedGenre = NOVEL_GENRES_DATA.novel_genres.find(
      g => totalWords >= g.min_words && totalWords <= g.max_words && chapters >= g.min_chapters && chapters <= g.max_chapters
    ) || NOVEL_GENRES_DATA.novel_genres.find(
      g => totalWords >= g.min_words && totalWords <= g.max_words
    ) || NOVEL_GENRES_DATA.novel_genres.find(
      g => Math.abs((g.min_words + g.max_words) / 2 - totalWords) < 25000
    );
  }

  // Broad Scope Tagging
  let scopeCategory = "Standard Novel";
  if (totalWords < 7500) scopeCategory = "Flash Suite / Micro-Fiction";
  else if (totalWords < 20000) scopeCategory = "Novelette";
  else if (totalWords < 50000) scopeCategory = "Novella";
  else if (totalWords < 90000) scopeCategory = "Commercial Novel";
  else if (totalWords < 150000) scopeCategory = "Full-Length Epic Novel";
  else scopeCategory = "Grand Saga / Multi-Arc Epic";

  // Density Tagging
  let densityLabel = "Standard Literary Chapters";
  let densityPacing = "Full chapter immersion with multi-stage scenes, deep internal monologues, and rich sensory descriptions.";
  if (wordsPerChapter < 800) {
    densityLabel = "Brisk Micro-Chapters";
    densityPacing = "Rapid-fire chapters designed for intense page-turning velocity and quick cliffhangers.";
  } else if (wordsPerChapter < 1800) {
    densityLabel = "Compact Commercial Chapters";
    densityPacing = "Snappy commercial fiction pacing with focused dialogue and crisp scene resolutions.";
  } else if (wordsPerChapter <= 3000) {
    densityLabel = "Standard Literary / Immersive Chapters";
    densityPacing = "The gold standard for modern bestselling fiction with rich interiority, dialogue, and sensory detail.";
  } else if (wordsPerChapter <= 5000) {
    densityLabel = "Extended Epic Chapters";
    densityPacing = "Expansive, multi-scene chapters featuring rich worldbuilding, multiple perspectives, and intricate dialogues.";
  } else {
    densityLabel = "Novelistic Movements / Long Parts";
    densityPacing = "Grand scale narrative movements with shifting settings, extensive internal development, and epic pacing.";
  }

  // Generate Smart Helper Advice incorporating Genre & Structure Rationale
  const guidancePoints = [];
  if (matchedGenre) {
    guidancePoints.push(`🎯 Genre Model: ${matchedGenre.genre} (${matchedGenre.reading_style}).`);
    guidancePoints.push(`${matchedGenre.structural_rationale}`);
  } else {
    guidancePoints.push(`📖 ${scopeCategory}: ${densityPacing}`);
  }

  if (chapters >= 45) {
    guidancePoints.push("🏛️ Multi-Act Architecture: Narrative Architect will distribute the story across major multi-volume acts, regional shifts, and episodic milestones.");
  }

  if (wordsPerChapter < 700) {
    guidancePoints.push("⚡ Velocity Alert: Pacing will be ultra-brisk with rapid episodic scene cuts and high-frequency cliffhangers.");
  } else if (wordsPerChapter > 3500) {
    guidancePoints.push("📜 Expansion Alert: Chapters will function as deep multi-scene movements with extensive dialogue and internal monologue.");
  }

  const helperText = guidancePoints.join(" ");

  const mathBanner = {
    totalWords,
    chapters,
    wordsPerChapter,
    formulaText: `${totalWords.toLocaleString()} Total Words ÷ ${chapters} Chapters = ~${wordsPerChapter.toLocaleString()} Words / Chapter`
  };

  return {
    chapters,
    totalWords,
    wordsPerChapter,
    scopeCategory,
    densityLabel,
    matchedGenre,
    helperText,
    mathBanner
  };
}

