import { QuizData } from './cambridge-syllabus';

/**
 * Returns a fallback MCQ quiz when Google Gemini API fails.
 * Fully localized to Zanzibar and includes English translations for any Swahili phrases.
 */
export function getFallbackQuiz(subject: string, grade: string, topic: string, numQuestions: number): QuizData {
  const cleanSubject = subject.trim();
  const cleanGrade = grade.trim();
  const cleanTopic = topic.trim();
  
  // 1. Math Fractions/Counting fallback
  if (cleanSubject.toLowerCase() === 'mathematics') {
    return {
      title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
      description: `A fallback math quiz covering ${cleanTopic} with Zanzibar market examples.`,
      cambridgeObjective: 'Perform basic math operations and practical calculations using local contexts.',
      questions: [
        {
          id: 'q1',
          question: 'If you buy 3 coconuts (dafu) at Darajani Market and each costs 1,500 TZS, how much is the total?',
          options: ['3,000 TZS', '4,500 TZS', '5,000 TZS', '6,000 TZS'],
          correctIndex: 1,
          explanation: '3 multiplied by 1,500 is 4,500 TZS. (Dafu is the Swahili word for young coconut).'
        },
        {
          id: 'q2',
          question: 'A fisherman harvests 10 fish. He sells 1/2 of his harvest. How many fish does he sell?',
          options: ['2 fish', '4 fish', '5 fish', '8 fish'],
          correctIndex: 2,
          explanation: 'Half (1/2) of 10 is 5.'
        },
        {
          id: 'q3',
          question: 'There are 12 mangoes in a basket. 1/3 of them are ripe. How many mangoes are ripe?',
          options: ['3 mangoes', '4 mangoes', '6 mangoes', '8 mangoes'],
          correctIndex: 1,
          explanation: '1/3 of 12 is calculated as 12 divided by 3, which equals 4 mangoes.'
        },
        {
          id: 'q4',
          question: 'A spice vendor weighs 500 grams of cloves (karafuu) and 250 grams of cinnamon. What is the total weight?',
          options: ['600 grams', '700 grams', '750 grams', '1,000 grams'],
          correctIndex: 2,
          explanation: '500 + 250 = 750 grams. (Karafuu is the Swahili word for cloves).'
        },
        {
          id: 'q5',
          question: 'A class has 20 students. 1/4 of them are from Stone Town. How many students are from Stone Town?',
          options: ['4 students', '5 students', '10 students', '15 students'],
          correctIndex: 1,
          explanation: '1/4 of 20 is 20 divided by 4, which is 5.'
        }
      ].slice(0, numQuestions)
    };
  }

  // 2. Science fallback
  if (cleanSubject.toLowerCase() === 'science') {
    return {
      title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
      description: `A fallback science quiz about ${cleanTopic} focusing on coastal environments.`,
      cambridgeObjective: 'Understand habitats, living organisms, and climate conditions in tropical regions.',
      questions: [
        {
          id: 'q1',
          question: 'Which habitat is found along the shallow coastal waters of Zanzibar and supports rich marine life?',
          options: ['Desert sand dunes', 'Coral reefs', 'Pine forests', 'Mountain glaciers'],
          correctIndex: 1,
          explanation: 'Coral reefs are highly diverse marine ecosystems that thrive in warm, shallow tropical waters like Zanzibar.'
        },
        {
          id: 'q2',
          question: 'The Red Colobus Monkey is endemic to which famous forest reserve in Zanzibar?',
          options: ['Jozani Forest', 'Serengeti Park', 'Ngorongoro Crater', 'Darajani Market'],
          correctIndex: 0,
          explanation: 'Jozani Chwaka Bay National Park is the only national park in Zanzibar and is famous for the Red Colobus monkeys.'
        },
        {
          id: 'q3',
          question: 'What weather instrument is used to measure the daily rainfall in Stone Town?',
          options: ['Thermometer', 'Barometer', 'Rain gauge', 'Anemometer'],
          correctIndex: 2,
          explanation: 'A rain gauge is specifically designed to collect and measure the amount of liquid precipitation over a set period of time.'
        },
        {
          id: 'q4',
          question: 'Which of the following is a primary producer in the Indian Ocean marine ecosystem?',
          options: ['Green Sea Turtle', 'Algae (Seaweed)', 'Spinner Dolphin', 'Reef Shark'],
          correctIndex: 1,
          explanation: 'Algae (Seaweed) uses sunlight to produce energy through photosynthesis, making it a primary producer.'
        },
        {
          id: 'q5',
          question: 'Clove trees (karafuu) grow in Zanzibar. What part of the clove tree is harvested to make the aromatic spice?',
          options: ['The roots', 'The flower buds', 'The bark', 'The seeds'],
          correctIndex: 1,
          explanation: 'Cloves are the aromatic dried flower buds of the Syzygium aromaticum tree. (Karafuu is the Swahili word for cloves).'
        }
      ].slice(0, numQuestions)
    };
  }

  // 3. Kiswahili fallback
  if (cleanSubject.toLowerCase() === 'kiswahili') {
    return {
      title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
      description: `A fallback Kiswahili grammar and vocabulary quiz about ${cleanTopic} with English translations.`,
      cambridgeObjective: 'Develop vocabulary, spelling, and sentence structures in Swahili.',
      questions: [
        {
          id: 'q1',
          question: 'Translate this famous Swahili saying: "Haba na haba hujaza kibaba".',
          options: [
            'Patience brings blessings (Subira huleta baraka)',
            'Little by little fills the measure',
            'Water is life (Maji ni uzima)',
            'Hurry hurry has no blessings (Haraka haraka haina baraka)'
          ],
          correctIndex: 1,
          explanation: '"Haba na haba hujaza kibaba" translates to "Little by little fills the measure" (or "many a mickle makes a muckle").'
        },
        {
          id: 'q2',
          question: 'What is the English translation of the Swahili word "Karafuu"?',
          options: ['Cloves', 'Cinnamon', 'Black pepper', 'Cardamom'],
          correctIndex: 0,
          explanation: '"Karafuu" means cloves, which is the historical cash crop of Zanzibar.'
        },
        {
          id: 'q3',
          question: 'Complete the sentence with the correct greeting: When greeting an elder, you should say "________".',
          options: ['Jambo (Hello)', 'Mambo (How are things)', 'Shikamoo (I hold your feet - respectful greeting)', 'Habari (News)'],
          correctIndex: 2,
          explanation: '"Shikamoo" (literally "I hold your feet") is the respectful greeting used for elders in Swahili culture.'
        },
        {
          id: 'q4',
          question: 'What does "Maji" mean in English?',
          options: ['Fire', 'Water', 'Earth', 'Wind'],
          correctIndex: 1,
          explanation: '"Maji" translates to water in English.'
        },
        {
          id: 'q5',
          question: 'What is the meaning of the Swahili saying: "Haraka haraka haina baraka"?',
          options: [
            'Hurry hurry has no blessings (haste makes waste)',
            'A friend in need is a friend indeed',
            'Unity is strength (Umoja ni nguvu)',
            'Better late than never'
          ],
          correctIndex: 0,
          explanation: '"Haraka haraka haina baraka" translates to "Hurry hurry has no blessings" (haste makes waste).'
        }
      ].slice(0, numQuestions)
    };
  }

  // 4. English Language fallback
  if (cleanSubject.toLowerCase().includes('english')) {
    return {
      title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
      description: `A fallback English language quiz covering ${cleanTopic} with Zanzibar context.`,
      cambridgeObjective: 'Develop vocabulary, reading comprehension, and correct grammar usage in practical scenarios.',
      questions: [
        {
          id: 'q1',
          question: 'Choose the correct adjective to complete the sentence: "The traditional dhow boat sailed across the ________ ocean."',
          options: ['loudly', 'blue', 'run', 'yesterday'],
          correctIndex: 1,
          explanation: '"blue" is an adjective describing the noun "ocean".'
        },
        {
          id: 'q2',
          question: 'What is the past tense of the verb "to visit" in the sentence: "We ________ Stone Town last Saturday"?',
          options: ['visiting', 'visits', 'visited', 'visit'],
          correctIndex: 2,
          explanation: '"visited" is the simple past tense of "visit".'
        },
        {
          id: 'q3',
          question: 'Which word is a noun in this sentence: "The aromatic cloves grow on tall trees in Pemba"?',
          options: ['aromatic', 'cloves', 'grow', 'tall'],
          correctIndex: 1,
          explanation: '"cloves" (karafuu) is a noun naming the spice.'
        },
        {
          id: 'q4',
          question: 'Identify the correct punctuation mark to end the question: "Have you seen the giant tortoises on Prison Island________"',
          options: ['.', '!', '?', ','],
          correctIndex: 2,
          explanation: 'A question mark (?) is required at the end of an interrogative sentence.'
        },
        {
          id: 'q5',
          question: 'What is the synonym (word with similar meaning) for "ancient" when referring to the ancient buildings of Stone Town?',
          options: ['new', 'old', 'small', 'bright'],
          correctIndex: 1,
          explanation: '"old" has a similar meaning to "ancient".'
        }
      ].slice(0, numQuestions)
    };
  }

  // 5. Global Perspectives fallback
  if (cleanSubject.toLowerCase().includes('global') || cleanSubject.toLowerCase().includes('perspectives')) {
    return {
      title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
      description: `A fallback Global Perspectives quiz covering ${cleanTopic} with local community and global awareness.`,
      cambridgeObjective: 'Examine community responsibilities, cultural heritage, and environmental sustainability.',
      questions: [
        {
          id: 'q1',
          question: 'Why is it important to protect coral reefs along the coast of Zanzibar?',
          options: [
            'They provide habitats for fish and protect our coastline from heavy waves',
            'They make the ocean water hotter',
            'They prevent ships from sailing anywhere',
            'They have no effect on marine life'
          ],
          correctIndex: 0,
          explanation: 'Coral reefs are vital marine ecosystems and act as natural barriers against coastal erosion.'
        },
        {
          id: 'q2',
          question: 'What does community cooperation (umoja ni nguvu - unity is strength) mean in our daily lives?',
          options: [
            'Working alone and refusing help from everyone',
            'Helping neighbors and working together on community cleanup projects',
            'Ignoring litter on school grounds',
            'Arguing with friends over minor disagreements'
          ],
          correctIndex: 1,
          explanation: 'Cooperation means joining efforts to help others and improve our shared environment.'
        },
        {
          id: 'q3',
          question: 'How can students reduce plastic waste around coastal areas like Nungwi and Paje?',
          options: [
            'Throwing plastic bottles into the sea',
            'Using reusable bags and recycling water bottles',
            'Burning all plastic garbage on the beach',
            'Buying more single-use plastics every day'
          ],
          correctIndex: 1,
          explanation: 'Reusable items and proper recycling reduce ocean plastic pollution.'
        },
        {
          id: 'q4',
          question: 'Why do visitors and travelers from around the world visit Stone Town?',
          options: [
            'To experience its unique Swahili architecture, history, and diverse cultural heritage',
            'Because there are no other islands anywhere',
            'To avoid seeing any historical landmarks',
            'Because Stone Town has no history'
          ],
          correctIndex: 0,
          explanation: 'Stone Town is a UNESCO World Heritage site known for its rich cultural history and architecture.'
        },
        {
          id: 'q5',
          question: 'When people from different cultures share their music and food, what positive outcome happens?',
          options: [
            'We learn to respect and appreciate mutual global diversity and understanding',
            'Everybody stops talking to each other',
            'Communities become weaker',
            'People forget how to cook'
          ],
          correctIndex: 0,
          explanation: 'Sharing culture builds global understanding, empathy, and respect.'
        }
      ].slice(0, numQuestions)
    };
  }

  // 6. Computing & Digital Literacy fallback
  if (cleanSubject.toLowerCase().includes('computing') || cleanSubject.toLowerCase().includes('digital')) {
    return {
      title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
      description: `A fallback computing quiz about ${cleanTopic} focusing on basic technology and safe internet use.`,
      cambridgeObjective: 'Understand digital tools, basic programming logic, and online safety principles.',
      questions: [
        {
          id: 'q1',
          question: 'Which of the following is considered personal information that you should NEVER share online with strangers?',
          options: ['Your favorite fruit', 'Your full home address and passwords', 'The name of your school sport team', 'Your favorite school subject'],
          correctIndex: 1,
          explanation: 'Home addresses and passwords are confidential personal data and must be kept private.'
        },
        {
          id: 'q2',
          question: 'In computer programming, what is an "algorithm"?',
          options: [
            'A type of computer screen',
            'A step-by-step set of instructions to solve a problem or complete a task',
            'A broken keyboard button',
            'A computer virus'
          ],
          correctIndex: 1,
          explanation: 'An algorithm is a precise sequence of steps or instructions.'
        },
        {
          id: 'q3',
          question: 'What hardware device is used to move the pointer on a computer screen and click on icons?',
          options: ['Printer', 'Mouse or touchpad', 'Speaker', 'Microphone'],
          correctIndex: 1,
          explanation: 'A computer mouse or touchpad controls the screen cursor.'
        },
        {
          id: 'q4',
          question: 'Why should you always ask a teacher or parent before downloading an unknown file from the internet?',
          options: [
            'Because the file might contain malware or viruses that can harm the computer',
            'Because downloading always turns off the monitor',
            'Because computers cannot download files',
            'Because files have no names'
          ],
          correctIndex: 0,
          explanation: 'Safety checks prevent downloading harmful software or viruses.'
        },
        {
          id: 'q5',
          question: 'What does the "Save" icon (usually shaped like a floppy disk) do when working on a digital document?',
          options: ['Deletes your work permanently', 'Stores your work in computer memory so it is not lost', 'Prints the page immediately', 'Shuts down the computer'],
          correctIndex: 1,
          explanation: 'Saving stores data safely to disk or cloud storage.'
        }
      ].slice(0, numQuestions)
    };
  }

  // 7. Art & Craft fallback
  if (cleanSubject.toLowerCase().includes('art') || cleanSubject.toLowerCase().includes('craft')) {
    return {
      title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
      description: `A fallback Art & Craft quiz about ${cleanTopic} covering colors and traditional Zanzibar crafts.`,
      cambridgeObjective: 'Explore artistic expression, color theory, and local craft traditions.',
      questions: [
        {
          id: 'q1',
          question: 'When you mix the primary colors blue and yellow together, what secondary color is created?',
          options: ['Red', 'Green', 'Purple', 'Orange'],
          correctIndex: 1,
          explanation: 'Blue mixed with yellow produces green.'
        },
        {
          id: 'q2',
          question: 'Tingatinga is a famous East African painting style originated in Tanzania. What are its typical characteristics?',
          options: [
            'Bright, vibrant colors depicting stylized animals and birds with bold outlines',
            'Black and white pencil sketches of only cars',
            'Invisible paint on dark paper',
            'Photographs taken with a camera'
          ],
          correctIndex: 0,
          explanation: 'Tingatinga art is renowned for its brilliant colors and whimsical depiction of African wildlife.'
        },
        {
          id: 'q3',
          question: 'What natural material commonly found along the Zanzibar coast is woven by artisans to make traditional baskets and mats (mkeka)?',
          options: ['Palm leaves (makuti/ukili)', 'Iron rods', 'Glass beads', 'Wool yarn'],
          correctIndex: 0,
          explanation: 'Palm leaves (ukili/makuti) are harvested and dried to weave beautiful mats and baskets.'
        },
        {
          id: 'q4',
          question: 'Which of the following is considered a "warm color" in art theory?',
          options: ['Blue', 'Ice gray', 'Red or orange', 'Dark green'],
          correctIndex: 2,
          explanation: 'Red, orange, and yellow remind us of heat and sunshine, so they are warm colors.'
        },
        {
          id: 'q5',
          question: 'What tool does an artist use to blend soft charcoal or pencil shading on a drawing?',
          options: ['Hammer', 'Blending stump or clean cloth/paper', 'Scissors', 'Water bucket'],
          correctIndex: 1,
          explanation: 'Blending stumps or soft paper smooth and blend charcoal shades.'
        }
      ].slice(0, numQuestions)
    };
  }

  // 8. Music fallback
  if (cleanSubject.toLowerCase().includes('music')) {
    return {
      title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
      description: `A fallback Music quiz about ${cleanTopic} covering rhythm and traditional musical instruments.`,
      cambridgeObjective: 'Recognize rhythm, melody, and traditional instruments in regional and global music.',
      questions: [
        {
          id: 'q1',
          question: 'Taarab is a popular traditional musical genre of Zanzibar. Which instrument, often played in Taarab, is a traditional stringed zither or lute?',
          options: ['Qanun (or Oud)', 'Electric bass guitar', 'Trumpet', 'Snare drum'],
          correctIndex: 0,
          explanation: 'The Qanun and Oud are classic string instruments essential to traditional Taarab orchestras in Zanzibar.'
        },
        {
          id: 'q2',
          question: 'In music, what do we call the steady pulse or beat that you can clap along to in a song?',
          options: ['Silence', 'Rhythm / Tempo', 'Lyrics', 'Volume'],
          correctIndex: 1,
          explanation: 'The rhythm or tempo is the steady beat governing the speed and flow of music.'
        },
        {
          id: 'q3',
          question: 'Which of these is a percussion instrument that produces sound when struck with hands or sticks?',
          options: ['Flute', 'Ngoma (African Drum)', 'Violin', 'Clarinet'],
          correctIndex: 1,
          explanation: 'The Ngoma (drum) is a traditional percussion instrument played across East Africa.'
        },
        {
          id: 'q4',
          question: 'What is the term for two or more notes played or sung together at the same time to create a pleasing sound?',
          options: ['Solo', 'Harmony', 'Whisper', 'Silence'],
          correctIndex: 1,
          explanation: 'Harmony occurs when different pitches combine simultaneously.'
        },
        {
          id: 'q5',
          question: 'When a piece of music gradually gets louder, what is the musical dynamic term for this increase in volume?',
          options: ['Crescendo', 'Diminuendo', 'Staccato', 'Presto'],
          correctIndex: 0,
          explanation: 'Crescendo means gradually increasing in loudness.'
        }
      ].slice(0, numQuestions)
    };
  }

  // 9. Default dynamic fallback using Cambridge Curriculum Data
  let objectiveSnippet = `Understand key topics in ${cleanSubject} related to ${cleanTopic}.`;
  try {
    const data = require('./data/curriculum/all_subjects.json');
    const subjKey = Object.keys(data).find(k => {
      const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normS = cleanSubject.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normK === normS || (normS.includes('english') && normK === 'english') || (normS.includes('art') && normK.includes('art'));
    });
    if (subjKey) {
      const stageObj = data[subjKey];
      const stageNumMatch = cleanGrade.match(/\d+/);
      if (stageNumMatch) {
        const stKey = `Stage ${stageNumMatch[0]}`;
        const topicsList = stageObj[stKey] || [];
        const matchedTopic = topicsList.find((t: any) => t.topic.toLowerCase().includes(cleanTopic.toLowerCase()));
        if (matchedTopic && matchedTopic.content) {
          // Use the first few sentences of the curriculum content as the objective
          objectiveSnippet = matchedTopic.content.split('\n')[0].substring(0, 120) + "...";
        }
      }
    }
  } catch (e) {
    // silently fail and use default
  }

  return {
    title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
    description: `A generic offline quiz on ${cleanTopic} under ${cleanSubject}.`,
    cambridgeObjective: objectiveSnippet,
    questions: [
      {
        id: 'q1',
        question: `Which concept is primarily studied under the topic "${cleanTopic}"?`,
        options: ['General knowledge', 'Core curriculum principles', 'Extracurricular activities', 'Irrelevant facts'],
        correctIndex: 1,
        explanation: 'This question tests your basic understanding of the curriculum structure.'
      },
      {
        id: 'q2',
        question: `Why is the study of "${cleanTopic}" important?`,
        options: [
          'It has no relevance',
          'It helps build foundational knowledge for this subject',
          'It is only useful for exams',
          'It is a random topic'
        ],
        correctIndex: 1,
        explanation: 'All topics in the Cambridge framework build foundational knowledge.'
      },
      {
        id: 'q3',
        question: `Which of the following would be an expected learning outcome for "${cleanTopic}"?`,
        options: [
          'Forgetting the material',
          'Applying the concept to solve problems',
          'Ignoring the teacher',
          'Sleeping in class'
        ],
        correctIndex: 1,
        explanation: 'Applying concepts to solve problems is a core objective of learning.'
      },
      {
        id: 'q4',
        question: `How does "${cleanTopic}" relate to previous learning?`,
        options: [
          'It builds on prior knowledge in a spiral approach',
          'It is completely disconnected',
          'It contradicts everything learned before',
          'It deletes past memories'
        ],
        correctIndex: 0,
        explanation: 'Cambridge Primary uses a spiral approach, revisiting and expanding on topics.'
      },
      {
        id: 'q5',
        question: `What should a student do if they struggle with "${cleanTopic}"?`,
        options: [
          'Give up immediately',
          'Ask the teacher or use reference materials',
          'Skip the topic entirely',
          'Guess all the answers'
        ],
        correctIndex: 1,
        explanation: 'Asking for help and using resources are key learning strategies.'
      }
    ].slice(0, numQuestions)
  };
}
