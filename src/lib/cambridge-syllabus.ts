export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizData {
  title: string;
  description: string;
  cambridgeObjective: string;
  questions: Question[];
}

/**
 * Server-side marking engine for MCQ quizzes.
 * Validates student choices against correct indices and computes scoring metadata.
 */
export function markQuiz(questions: Question[], studentAnswers: { [questionId: string]: number }) {
  let score = 0;
  const maxScore = questions.length;
  
  const results = questions.map((q) => {
    const studentChoice = studentAnswers[q.id];
    const isCorrect = studentChoice === q.correctIndex;
    if (isCorrect) {
      score += 1;
    }
    return {
      questionId: q.id,
      questionText: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      studentChoice: studentChoice !== undefined ? studentChoice : -1,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    score,
    maxScore,
    percentage,
    results,
  };
}

/**
 * Standard templates for Cambridge syllabus prompts based on subject and grade.
 * localizes questions to Zanzibar, Tanzania.
 * Critical Rule: Swahili terms or phrases must always include their English translation.
 */
export function getCambridgePrompt(subject: string, grade: string, topic: string, numQuestions: number): string {
  const normalizedSubject = subject.trim();
  const normalizedGrade = grade.trim();
  const normalizedTopic = topic.trim();

  let subjectGuidelines = "";

  switch (normalizedSubject.toLowerCase()) {
    case "mathematics":
      subjectGuidelines = `
- Focus on practical arithmetic, counting, weights, and measurements.
- Use local Zanzibar context such as counting coconuts, mangoes, pineapples, calculations involving Tanzanian Shillings (TZS), or dhow boats.
- Keep numbers age-appropriate: Grade 1 (within 20), Grade 2 (within 100), Grade 3 (within 1,000).`;
      break;

    case "science":
      subjectGuidelines = `
- Focus on ecosystems, weather patterns, plants, animals, or physical materials.
- Localize examples: Nungwi/Paje coral reefs, Indian Ocean marine life (sea turtles, dolphins, red colobus monkeys in Jozani Forest), Stone Town weather, or tropical plants (clove tree, cinnamon).`;
      break;

    case "kiswahili":
      subjectGuidelines = `
- Focus on grammar, vocabulary, or traditional Swahili sayings (methali).
- CRITICAL RULE: Since the primary instruction language is English, any Kiswahili phrase, proverb (methali), or vocabulary word used in questions or options MUST immediately be followed by its English translation in parentheses. Example: "kanga (printed cotton fabric)" or "Subira kwanza huleta baraka (Patience brings blessings)".`;
      break;

    case "english language":
    default:
      subjectGuidelines = `
- Focus on grammar, vocabulary, comprehension, or sentence structure.
- Contextualize stories and sentences around Zanzibar travel, school life, marine life, or spice trade histories.`;
      break;
  }

  return `You are a professional educational assessor designing a Cambridge syllabus multiple-choice quiz for ${normalizedGrade} students at Leaders International School in Zanzibar, Tanzania.

Generate a quiz with exactly ${numQuestions} questions on the topic: "${normalizedTopic}" for the subject: "${normalizedSubject}".

Guidelines:
1. Target the ${normalizedGrade} cognitive level. Keep language simple, clear, and direct.
2. Align questions with Cambridge Primary learning objectives.
3. ${subjectGuidelines}
4. For each question, provide exactly 4 options. Ensure the options are clear, plausible distractors, and only ONE is unambiguously correct.
5. Provide a clear, child-friendly explanation of why the correct option is correct. If any Swahili terms are used in the explanation, provide their English translation.
6. The JSON output must strictly match this TypeScript schema:
   {
     "title": string,
     "description": string,
     "cambridgeObjective": string,
     "questions": Array<{
       "id": string, // e.g. "q1", "q2", etc.
       "question": string,
       "options": string[], // exactly 4 items
       "correctIndex": number, // 0 to 3 corresponding to options index
       "explanation": string
     }>
   }

Return ONLY valid raw JSON. Do not include markdown code block formatting (no \`\`\`json tags), do not include any text before or after the JSON.`;
}
