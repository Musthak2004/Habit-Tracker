// ── Test Data Seeder ───────────────────────────────────────
// Generates realistic simulated habit data for end-to-end
// testing. All dates are relative to today.
// ───────────────────────────────────────────────────────────

import { Habit, Challenge, CoachingNudge, ReflectionReport } from '../types';

// ── Helpers ────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Generate completion record from a pattern string.
 *  pattern[0] = X days ago, pattern[-1] = today.
 *  '1' = completed, '0' = not completed.
 */
function patternCompletions(pattern: string): Record<string, number> {
  const completions: Record<string, number> = {};
  const total = pattern.length;
  for (let i = 0; i < total; i++) {
    if (pattern[i] === '1') {
      const d = new Date();
      d.setDate(d.getDate() - (total - 1 - i));
      completions[d.toISOString().split('T')[0]] = 1;
    }
  }
  return completions;
}

// ── Scenario 1: Consistent Performer ──────────────────────
// 4 habits, 60 days of data, mix of strengths

const S1_HABITS: Habit[] = [
  {
    id: 'seed-habit-meditation',
    name: 'Morning Meditation',
    type: 'boolean',
    targetCount: 1,
    createdAt: daysAgo(65),
    completions: patternCompletions(
      '111111011111110111111101111111011111110111111101111111011111' // 60 days, ~88%
    ),
    archived: false,
  },
  {
    id: 'seed-habit-water',
    name: 'Drink 8 Glasses Water',
    type: 'volume',
    targetCount: 8,
    createdAt: daysAgo(60),
    completions: patternCompletions(
      '111101111001110111110111101111011110111100111101111011110111' // 60 days, ~70%
    ),
    archived: false,
  },
  {
    id: 'seed-habit-read',
    name: 'Read 20 Pages',
    type: 'boolean',
    targetCount: 1,
    createdAt: daysAgo(55),
    completions: patternCompletions(
      '111101101111001110111110110111100111011110111011011110111011' // 60 days, ~62%
    ),
    archived: false,
  },
  {
    id: 'seed-habit-walk',
    name: 'Evening Walk',
    type: 'boolean',
    targetCount: 1,
    createdAt: daysAgo(58),
    completions: patternCompletions(
      '110110110010101110110011010110110010011010110010101010110010' // 60 days, ~45%
    ),
    archived: false,
  },
];

const S1_CHALLENGES: Challenge[] = [
  {
    id: 'seed-challenge-30day',
    habitId: null,
    name: '30-Day Consistency Challenge',
    description: 'Complete all habits for 30 days straight. You are building a foundation.',
    durationDays: 30,
    startDate: daysAgo(14),
    endDate: daysAgo(-16),
    requiredDaily: 4,
    reward: 'New workout gear',
    rewardEmoji: '🎽',
    completed: false,
    claimedAt: null,
    isOnboarding: false,
  },
];

const S1_NUDGES: CoachingNudge[] = [
  {
    id: 'seed-nudge-meditation',
    habitId: 'seed-habit-meditation',
    message: 'Your meditation streak hit 23 days, your best this year. On days you meditate, you are 3x more likely to hit your water goal too. It is your anchor habit.',
    type: 'insight',
    contextData: { habitName: 'Morning Meditation', currentStreak: 23, longestStreak: 23, consistency: 88 },
    createdAt: daysAgo(0),
    seen: false,
    dismissed: false,
  },
  {
    id: 'seed-nudge-water',
    habitId: 'seed-habit-water',
    message: '11-day water streak and climbing! You went from 3 glasses some days to hitting 8 consistently. That is a 60% improvement in two weeks.',
    type: 'motivational',
    contextData: { habitName: 'Drink 8 Glasses Water', currentStreak: 11, consistency: 71, weeklyCount: 49 },
    createdAt: daysAgo(1),
    seen: false,
    dismissed: false,
  },
  {
    id: 'seed-nudge-walk',
    habitId: 'seed-habit-walk',
    message: 'You have broken your walk streak 4 times this month, always on days you work late. What if your walk was 5 minutes around the block before dinner instead of 30? Tiny beats zero.',
    type: 'suggestion',
    contextData: { habitName: 'Evening Walk', currentStreak: 0, longestStreak: 7, consistency: 45 },
    createdAt: daysAgo(2),
    seen: false,
    dismissed: false,
  },
];

const S1_REFLECTIONS: ReflectionReport[] = [
  {
    id: 'seed-reflect-weekly1',
    periodStart: daysAgo(7),
    periodEnd: daysAgo(0),
    periodType: 'weekly',
    summaryText: 'A strong week at 72% across the board, up from 61% last week. Meditation was the star performer at 100%. Your evening walk took a hit mid-week due to late work nights, but you recovered Friday. The biggest win was reading at 5 logged days versus your usual 3.',
    reportData: {
      bestHabit: 'Morning Meditation',
      bestConsistency: 100,
      worstHabit: 'Evening Walk',
      worstConsistency: 43,
      overallConsistency: 72,
      topStreak: 23,
      totalCompletions: 24,
      habitSummaries: [
        { name: 'Morning Meditation', consistency: 100, streak: 23, trend: 'up', insight: 'Your meditation habit is bulletproof. It is the foundation everything else builds on.' },
        { name: 'Read 20 Pages', consistency: 71, streak: 4, trend: 'up', insight: 'Reading recovered well after a slow start to the week.' },
        { name: 'Drink 8 Glasses Water', consistency: 74, streak: 11, trend: 'stable', insight: 'Water stays consistent when you keep a bottle on your desk.' },
        { name: 'Evening Walk', consistency: 43, streak: 0, trend: 'down', insight: 'Evening walk is the first habit dropped on busy days.' },
      ],
      insights: [
        'When you walk even just once early in the week, you are 2x more likely to walk again the next day.',
        'Water consumption spikes on workout days. Exercise triggers your hydration awareness.',
      ],
      recommendations: [
        'Pre-schedule three 15-min walks in your calendar for next week. Commit ahead of time.',
        'Try a reading before bed rule: no phone until you have read 20 pages.',
      ],
    },
    createdAt: daysAgo(0),
  },
  {
    id: 'seed-reflect-monthly1',
    periodStart: daysAgo(30),
    periodEnd: daysAgo(0),
    periodType: 'monthly',
    summaryText: 'June was your best month yet at 76% overall consistency, up from 62% in May. You completed 97 habit actions across all 4 habits. Meditation had a perfect final week. Water went from averaging 5 glasses to 7.4 glasses per day. Reading showed consistent 3-4 day streaks with no long gaps. The evening walk remains your challenge at 42%.',
    reportData: {
      bestHabit: 'Morning Meditation',
      bestConsistency: 90,
      worstHabit: 'Evening Walk',
      worstConsistency: 42,
      overallConsistency: 76,
      topStreak: 23,
      totalCompletions: 97,
      habitSummaries: [
        { name: 'Morning Meditation', consistency: 90, streak: 23, trend: 'up', insight: 'Meditation is your most consistent habit by a wide margin.' },
        { name: 'Drink 8 Glasses Water', consistency: 79, streak: 11, trend: 'up', insight: 'Water is your most improved habit. You added 2.4 glasses per day over last month.' },
        { name: 'Read 20 Pages', consistency: 70, streak: 4, trend: 'up', insight: 'Your reading consistency grew 20% month over month.' },
        { name: 'Evening Walk', consistency: 42, streak: 0, trend: 'stable', insight: '30-minute walks are too ambitious for workdays. Shorten the bar.' },
      ],
      insights: [
        'Your habits cluster by time of day: morning habits never break, but evening habits are first to drop under stress.',
        'You average 31% higher consistency on weeks where you walk at least once.',
      ],
      recommendations: [
        'Declare a Tuesday minimum: just meditation plus a 10-min walk. Lower the bar for your hardest day.',
        'Try a 15-minute walk during lunch instead of evening. More energy, less fatigue.',
        'Link reading to your morning coffee instead of evening. Move it to your bulletproof time slot.',
      ],
    },
    createdAt: daysAgo(0),
  },
];

// ── Scenario 2: Streaky Starter ────────────────────────────
// 3 habits, 45 days, one strong habit pulling others up

const S2_HABITS: Habit[] = [
  {
    id: 'seed-habit-gym',
    name: 'Gym Workout',
    type: 'boolean',
    targetCount: 1,
    createdAt: daysAgo(48),
    completions: patternCompletions(
      '111111011111101111110111111011111101111111011111101111' // 45 days, ~85%
    ),
    archived: false,
  },
  {
    id: 'seed-habit-nosugar',
    name: 'No Added Sugar',
    type: 'boolean',
    targetCount: 1,
    createdAt: daysAgo(45),
    completions: patternCompletions(
      '111110011110001111000111100011110001111000111100011110' // 45 days, ~60%
    ),
    archived: false,
  },
  {
    id: 'seed-habit-journal',
    name: 'Morning Pages',
    type: 'volume',
    targetCount: 3,
    createdAt: daysAgo(42),
    completions: patternCompletions(
      '111001110001110010111000111000111001110001110010111000' // 45 days, ~50%
    ),
    archived: false,
  },
];

const S2_CHALLENGES: Challenge[] = [
  {
    id: 'seed-challenge-gym',
    habitId: 'seed-habit-gym',
    name: '21-Day Gym Streak',
    description: 'Hit the gym every day for 21 days to build the habit.',
    durationDays: 21,
    startDate: daysAgo(18),
    endDate: daysAgo(3),
    requiredDaily: 1,
    reward: 'New gym shirt',
    rewardEmoji: '👕',
    completed: false,
    claimedAt: null,
    isOnboarding: false,
  },
];

const S2_NUDGES: CoachingNudge[] = [
  {
    id: 'seed-nudge-gym',
    habitId: 'seed-habit-gym',
    message: '18 day gym streak! That is your longest run of the year by far. You went from skipping 3 days a week to 18 straight. That is not luck, that is a new identity forming.',
    type: 'motivational',
    contextData: { habitName: 'Gym Workout', currentStreak: 18, longestStreak: 18, consistency: 85 },
    createdAt: daysAgo(0),
    seen: false,
    dismissed: false,
  },
  {
    id: 'seed-nudge-sugar',
    habitId: 'seed-habit-nosugar',
    message: 'Your no-sugar streak always breaks on day 5 or 6. Not day 3, not day 10. Day 5 is the wall. Prep a specific replacement for day 5 evenings like flavored sparkling water and dark chocolate.',
    type: 'suggestion',
    contextData: { habitName: 'No Added Sugar', currentStreak: 0, longestStreak: 7, consistency: 62 },
    createdAt: daysAgo(1),
    seen: false,
    dismissed: false,
  },
  {
    id: 'seed-nudge-journal',
    habitId: 'seed-habit-journal',
    message: 'Your morning journal habit shows a clear pattern: you do great for 3-4 days, then skip 1-2. The missing link might be leaving your journal on the kitchen counter, not in the drawer. Visual cues beat willpower.',
    type: 'insight',
    contextData: { habitName: 'Morning Pages', currentStreak: 3, longestStreak: 7, consistency: 50 },
    createdAt: daysAgo(2),
    seen: false,
    dismissed: false,
  },
];

const S2_REFLECTIONS: ReflectionReport[] = [
  {
    id: 'seed-reflect-weekly2',
    periodStart: daysAgo(7),
    periodEnd: daysAgo(0),
    periodType: 'weekly',
    summaryText: 'A split week at 62%. The gym was perfect at 7 of 7 days. Nutrition started strong but broke on Thursday and Friday at a social dinner. You recovered Saturday which shows real resilience. The 18-day gym streak is the headline. Morning pages dipped to 43%, hurt by two mornings where you slept in.',
    reportData: {
      bestHabit: 'Gym Workout',
      bestConsistency: 100,
      worstHabit: 'Morning Pages',
      worstConsistency: 43,
      overallConsistency: 62,
      topStreak: 18,
      totalCompletions: 14,
      habitSummaries: [
        { name: 'Gym Workout', consistency: 100, streak: 18, trend: 'up', insight: 'The gym habit is fully automatic now. You do not even think about it.' },
        { name: 'No Added Sugar', consistency: 57, streak: 0, trend: 'down', insight: 'Social events are your primary nutrition trigger.' },
        { name: 'Morning Pages', consistency: 43, streak: 2, trend: 'down', insight: 'Morning pages suffered because you slept in on gym recovery days.' },
      ],
      insights: [
        'Two habits are compounding: nutrition and gym rise and fall together.',
        'You usually bounce back within 1-2 days after a slip. Your recovery speed is improving.',
      ],
      recommendations: [
        'Pre-plan a nutrition strategy for your next social event. Decide what you will eat before you arrive.',
        'Move morning pages to afternoon on recovery days when you sleep in.',
      ],
    },
    createdAt: daysAgo(0),
  },
  {
    id: 'seed-reflect-monthly2',
    periodStart: daysAgo(30),
    periodEnd: daysAgo(0),
    periodType: 'monthly',
    summaryText: 'June finished at 68% overall. Gym was the star at 85% with an 18-day streak, your best of the year. Nutrition showed a sawtooth pattern of 4-6 day streaks broken by weekend slips. Morning pages hovered at 50%, hurt by inconsistent wake-up times. You completed 57 total habit actions.',
    reportData: {
      bestHabit: 'Gym Workout',
      bestConsistency: 85,
      worstHabit: 'Morning Pages',
      worstConsistency: 50,
      overallConsistency: 68,
      topStreak: 18,
      totalCompletions: 57,
      habitSummaries: [
        { name: 'Gym Workout', consistency: 85, streak: 18, trend: 'up', insight: 'Your gym habit is a case study in how streaks build identity.' },
        { name: 'No Added Sugar', consistency: 62, streak: 0, trend: 'stable', insight: 'Weekend nutrition needs a specific plan, not just willpower.' },
        { name: 'Morning Pages', consistency: 50, streak: 2, trend: 'down', insight: 'Morning pages need to be earlier or easier.' },
      ],
      insights: [
        'One habit is fully autonomous, one is in progress, one is still searching for its form.',
        'You have a clear weekday advantage at 78% versus 48% on weekends.',
      ],
      recommendations: [
        'Lower the bar on morning pages to 5 minutes or just one sentence.',
        'Pack a weekend nutrition plan every Friday afternoon before the weekend starts.',
        'Celebrate the 18-day gym streak with a new workout shirt or playlist.',
      ],
    },
    createdAt: daysAgo(0),
  },
];

// ── Scenario 3: New Starter ────────────────────────────────
// 2 simple habits, 21 days tracked

const S3_HABITS: Habit[] = [
  {
    id: 'seed-habit-journaling',
    name: 'Morning Journaling',
    type: 'boolean',
    targetCount: 1,
    createdAt: daysAgo(24),
    completions: patternCompletions(
      '111111011111101111110111111' // 21 days, ~81%
    ),
    archived: false,
  },
  {
    id: 'seed-habit-stretch',
    name: 'Evening Stretching',
    type: 'boolean',
    targetCount: 1,
    createdAt: daysAgo(24),
    completions: patternCompletions(
      '111011011110110111101101111' // 21 days, ~62%
    ),
    archived: false,
  },
];

const S3_CHALLENGES: Challenge[] = [
  {
    id: 'seed-challenge-kickstart',
    habitId: null,
    name: '3-Day Kickstart',
    description: 'Complete all your habits for 3 days to build momentum.',
    durationDays: 3,
    startDate: daysAgo(21),
    endDate: daysAgo(18),
    requiredDaily: 2,
    reward: 'Starter badge',
    rewardEmoji: '🌟',
    completed: true,
    claimedAt: daysAgo(18),
    isOnboarding: true,
  },
];

const S3_NUDGES: CoachingNudge[] = [
  {
    id: 'seed-nudge-journaling',
    habitId: 'seed-habit-journaling',
    message: '10 days of journaling in a row. You started this from zero and now it is part of your morning. That is how habits are built, one day at a time.',
    type: 'motivational',
    contextData: { habitName: 'Morning Journaling', currentStreak: 10, longestStreak: 10, consistency: 81 },
    createdAt: daysAgo(0),
    seen: false,
    dismissed: false,
  },
  {
    id: 'seed-nudge-stretch',
    habitId: 'seed-habit-stretch',
    message: 'Your evening stretching is at 64% while your morning journaling is at 86%. Evening habits always start weaker because the day has drained your decision fuel. Try rolling out your mat right after dinner instead of waiting.',
    type: 'suggestion',
    contextData: { habitName: 'Evening Stretching', currentStreak: 4, longestStreak: 5, consistency: 62 },
    createdAt: daysAgo(1),
    seen: false,
    dismissed: false,
  },
];

const S3_REFLECTIONS: ReflectionReport[] = [
  {
    id: 'seed-reflect-weekly3',
    periodStart: daysAgo(7),
    periodEnd: daysAgo(0),
    periodType: 'weekly',
    summaryText: 'Your best week yet at 86% across both habits. Journaling was perfect at 7 of 7 days. Stretching hit 5 of 7. You missed stretching on Tuesday and Thursday, both days you ate dinner late. You identified the pattern and that alone is a win.',
    reportData: {
      bestHabit: 'Morning Journaling',
      bestConsistency: 100,
      worstHabit: 'Evening Stretching',
      worstConsistency: 71,
      overallConsistency: 86,
      topStreak: 10,
      totalCompletions: 12,
      habitSummaries: [
        { name: 'Morning Journaling', consistency: 100, streak: 10, trend: 'up', insight: 'Your journaling habit is fully formed after just 3 weeks.' },
        { name: 'Evening Stretching', consistency: 71, streak: 4, trend: 'up', insight: 'Late dinner is a reliable predictor of missed stretching.' },
      ],
      insights: [
        'Evening habits need more structure than morning ones.',
        'You have a clear weekday advantage at 100% versus 50% on weekends.',
      ],
      recommendations: [
        'Set a phone alarm for stretching at 8pm every night.',
        'Do a 3 minute stretch on late dinner nights instead of skipping entirely.',
      ],
    },
    createdAt: daysAgo(0),
  },
  {
    id: 'seed-reflect-monthly3',
    periodStart: daysAgo(21),
    periodEnd: daysAgo(0),
    periodType: 'monthly',
    summaryText: 'Your first 3 weeks averaged 72% across both habits. That is an outstanding start. Journaling led at 81% and stretching at 62%. You have a clear weekday advantage at 88% versus weekends at 38%. You are building the tracking habit alongside the health habits, which is a double win.',
    reportData: {
      bestHabit: 'Morning Journaling',
      bestConsistency: 81,
      worstHabit: 'Evening Stretching',
      worstConsistency: 62,
      overallConsistency: 72,
      topStreak: 10,
      totalCompletions: 26,
      habitSummaries: [
        { name: 'Morning Journaling', consistency: 81, streak: 10, trend: 'up', insight: 'Your morning habit is nearly automatic after just 3 weeks.' },
        { name: 'Evening Stretching', consistency: 62, streak: 4, trend: 'up', insight: 'You have early evidence that visible cues improve consistency.' },
      ],
      insights: [
        'You are averaging 26 completions in your first 3 weeks, ahead of most new habit trackers.',
        'The weekend gap is your biggest opportunity for growth.',
      ],
      recommendations: [
        'Create a separate weekend morning routine: journal with coffee, stretch for 3 minutes.',
        'Put your stretching mat out before bed every night.',
        'You have done amazingly well for 3 weeks. The foundation is solid.',
      ],
    },
    createdAt: daysAgo(0),
  },
];

// ── Public API ─────────────────────────────────────────────
export interface SeedScenario {
  name: string;
  emoji: string;
  description: string;
  habits: Habit[];
  challenges: Challenge[];
  nudges: CoachingNudge[];
  reflections: ReflectionReport[];
}

export const SCENARIOS: SeedScenario[] = [
  {
    name: 'Consistent Performer',
    emoji: '💪',
    description: '4 habits over 60 days with strong streaks and one weak habit. Best for testing the full app.',
    habits: S1_HABITS,
    challenges: S1_CHALLENGES,
    nudges: S1_NUDGES,
    reflections: S1_REFLECTIONS,
  },
  {
    name: 'Streaky Starter',
    emoji: '📈',
    description: '3 habits over 45 days with one strong habit pulling the others up. Great for testing nudge patterns.',
    habits: S2_HABITS,
    challenges: S2_CHALLENGES,
    nudges: S2_NUDGES,
    reflections: S2_REFLECTIONS,
  },
  {
    name: 'New Starter',
    emoji: '🌱',
    description: '2 simple habits over 21 days with onboarding already done. Clean slate with some history.',
    habits: S3_HABITS,
    challenges: S3_CHALLENGES,
    nudges: S3_NUDGES,
    reflections: S3_REFLECTIONS,
  },
];
