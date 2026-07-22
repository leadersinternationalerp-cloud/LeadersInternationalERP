/**
 * Timetable AI Natural Language Time Parser
 * Parses strings like: '8am start, 45min lessons, 10min break after 2nd, 20min after 4th, 1hr lunch after 6th'
 */

export interface ParsedSlot {
  period_number: number;
  name: string;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  is_break: boolean;
}

export function parseTimetableConfig(text: string, totalPeriods: number = 8): ParsedSlot[] {
  // Default values
  let startHour = 8;
  let startMin = 0;
  let lessonDuration = 40; // in minutes

  const breakAfterPeriods: Record<number, { duration: number; name: string }> = {};

  const cleanText = text.toLowerCase();

  // 1. Parse start time (e.g., "8am start", "8:30am start", "9:00 start", "08:30 start")
  const startMatch = cleanText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*start/);
  if (startMatch) {
    let hr = parseInt(startMatch[1], 10);
    const min = startMatch[2] ? parseInt(startMatch[2], 10) : 0;
    const ampm = startMatch[3];

    if (ampm === 'pm' && hr < 12) {
      hr += 12;
    } else if (ampm === 'am' && hr === 12) {
      hr = 0;
    }
    startHour = hr;
    startMin = min;
  }

  // 2. Parse lesson duration (e.g., "45min lessons", "1hr lessons", "40m lessons")
  const lessonMatch = cleanText.match(/(\d+)\s*(min|minute|mins|m|hr|hour|h)\s*lesson/);
  if (lessonMatch) {
    const amount = parseInt(lessonMatch[1], 10);
    const unit = lessonMatch[2];
    if (unit.startsWith('hr') || unit === 'h') {
      lessonDuration = amount * 60;
    } else {
      lessonDuration = amount;
    }
  }

  // 3. Parse breaks & lunch (e.g. "10min break after 2nd", "20min after 4th", "1hr lunch after 6th")
  // Matches expressions like: [duration] [unit] [break/lunch] after [nth]
  const breakRegex = /(\d+)\s*(min|minute|mins|m|hr|hour|h)\s*(break|lunch)?\s*(?:after|post)\s*(\d+)/g;
  let match;
  while ((match = breakRegex.exec(cleanText)) !== null) {
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const isLunch = match[3] === 'lunch';
    const periodNum = parseInt(match[5], 10);

    let duration = amount;
    if (unit.startsWith('hr') || unit === 'h') {
      duration = amount * 60;
    }

    breakAfterPeriods[periodNum] = {
      duration,
      name: isLunch ? 'Lunch' : 'Break'
    };
  }

  // Build the slots sequence
  const slots: ParsedSlot[] = [];
  let currentHour = startHour;
  let currentMin = startMin;
  let periodCount = 1;

  const addMinutes = (h: number, m: number, minsToAdd: number) => {
    let newMin = m + minsToAdd;
    let newHour = h + Math.floor(newMin / 60);
    newMin = newMin % 60;
    newHour = newHour % 24;
    return { hour: newHour, min: newMin };
  };

  const formatTime = (h: number, m: number): string => {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Generate sequence of periods and breaks
  for (let i = 1; i <= totalPeriods; i++) {
    // 1. Add Lesson Period
    const startTimeStr = formatTime(currentHour, currentMin);
    const end = addMinutes(currentHour, currentMin, lessonDuration);
    const endTimeStr = formatTime(end.hour, end.min);

    slots.push({
      period_number: periodCount,
      name: `Period ${periodCount}`,
      start_time: startTimeStr,
      end_time: endTimeStr,
      is_break: false
    });

    currentHour = end.hour;
    currentMin = end.min;

    // 2. Check if a break is scheduled after this period
    if (breakAfterPeriods[i]) {
      const br = breakAfterPeriods[i];
      const breakStart = formatTime(currentHour, currentMin);
      const breakEnd = addMinutes(currentHour, currentMin, br.duration);
      const breakEndStr = formatTime(breakEnd.hour, breakEnd.min);

      slots.push({
        period_number: periodCount, // belongs index-wise after this period
        name: br.name,
        start_time: breakStart,
        end_time: breakEndStr,
        is_break: true
      });

      currentHour = breakEnd.hour;
      currentMin = breakEnd.min;
    }

    periodCount++;
  }

  return slots;
}
