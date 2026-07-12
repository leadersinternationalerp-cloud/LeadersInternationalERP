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

  // 4. Default English/Comprehension fallback (including any other subjects)
  return {
    title: `${cleanSubject} Quiz: ${cleanTopic} (Local Offline Backup)`,
    description: `A generic offline quiz on ${cleanTopic} under ${cleanSubject}.`,
    cambridgeObjective: `Understand key topics in ${cleanSubject} related to ${cleanTopic}.`,
    questions: [
      {
        id: 'q1',
        question: `Which word is closest in meaning to "${cleanTopic}"?`,
        options: ['Example', 'Topic detail', 'Related subject', 'Category'],
        correctIndex: 1,
        explanation: 'This is a general vocabulary question related to the topic.'
      },
      {
        id: 'q2',
        question: `Why is the study of "${cleanTopic}" important in Zanzibar?`,
        options: [
          'It has no relevance',
          'It connects to local history, trade, and natural environment',
          'It only applies in other countries',
          'It is a random subject'
        ],
        correctIndex: 1,
        explanation: 'Most subjects at Leaders International link directly to local history, ocean ecology, or agriculture.'
      },
      {
        id: 'q3',
        question: 'Identify the noun in the sentence: "The students saw a beautiful dhow (traditional boat) sailing near Stone Town."',
        options: ['saw', 'beautiful', 'dhow (traditional boat)', 'sailing'],
        correctIndex: 2,
        explanation: '"Dhow" (traditional sailing vessel) is a person, place, or thing, which makes it a noun.'
      },
      {
        id: 'q4',
        question: 'Which of the following describes the climate of Zanzibar?',
        options: ['Snowy and freezing', 'Hot and tropical', 'Dry desert', 'Cold and temperate'],
        correctIndex: 1,
        explanation: 'Zanzibar is situated near the equator and has a warm, humid tropical climate.'
      },
      {
        id: 'q5',
        question: 'What is the capital and historical heart of Zanzibar?',
        options: ['Dar es Salaam', 'Arusha', 'Stone Town', 'Dodoma'],
        correctIndex: 2,
        explanation: 'Stone Town (Mji Mkongwe in Swahili, meaning "Old Town") is the historical city center of Zanzibar City.'
      }
    ].slice(0, numQuestions)
  };
}
