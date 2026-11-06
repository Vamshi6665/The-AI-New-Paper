import { z } from 'zod';

/**
 * The Daily Edition — canonical event contract.
 *
 * Events are the SYSTEM OF RECORD (spec §11). The newspaper is a *rendering* of
 * events; AI-generated editorial copy never replaces a structured event. Zod
 * schemas here validate both user input and untrusted AI extraction output.
 */

export const EVENT_CATEGORIES = [
  'birthday',
  'fitness',
  'medical',
  'meeting',
  'appointment',
  'task',
  'deadline',
  'reminder',
  'travel',
  'meal',
  'study',
  'errand',
  'social',
  'finance',
  'habit',
  'other',
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  birthday: 'Birthday & Celebration',
  fitness: 'Health & Fitness',
  medical: 'Medical Appointment',
  meeting: 'Work & Meetings',
  appointment: 'Appointment',
  task: 'Personal Task',
  deadline: 'Deadline',
  reminder: 'Reminder',
  travel: 'Travel',
  meal: 'Meal & Nutrition',
  study: 'Study & Learning',
  errand: 'Household & Errands',
  social: 'Family & Social',
  finance: 'Finance & Bills',
  habit: 'Habit & Routine',
  other: 'Other',
};

export type Priority = 'low' | 'normal' | 'high';
export type EventStatus = 'active' | 'completed' | 'cancelled';
// how precise the time is: exact clock time, a part of day, or none
export type TimePrecision = 'exact' | 'partofday' | 'none';
export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export const ChecklistItemSchema = z.object({
  title: z.string().min(1).max(200),
  completed: z.boolean().default(false),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const EventSchema = z.object({
  id: z.string(),
  userId: z.string().default('demo-user'),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().default(null),
  category: z.enum(EVENT_CATEGORIES),
  dateLocal: z.string(), // yyyy-mm-dd in the user's timezone
  startTime: z.string().nullable().default(null), // "HH:mm" or null
  endTime: z.string().nullable().default(null),
  timePrecision: z.enum(['exact', 'partofday', 'none']).default('none'),
  partOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).nullable().default(null),
  allDay: z.boolean().default(false),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
  location: z.string().max(200).nullable().default(null),
  person: z.string().max(120).nullable().default(null), // for birthdays/social
  checklist: z.array(ChecklistItemSchema).default([]),
  reminderAt: z.string().nullable().default(null), // "HH:mm"
  linkedTo: z.string().nullable().default(null), // another event id (task → meeting)
  sourceType: z.enum(['nl', 'manual', 'voice']).default('nl'),
  sourceText: z.string().nullable().default(null),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type EventRecord = z.infer<typeof EventSchema>;

/**
 * What the AI extractor returns per event, BEFORE persistence. Separates
 * confirmed facts from AI suggestions (spec §7 step 6) and flags missing info.
 */
export const ExtractedEventSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(EVENT_CATEGORIES),
  dateLocal: z.string(),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
  timePrecision: z.enum(['exact', 'partofday', 'none']).default('none'),
  partOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).nullable().default(null),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  location: z.string().max(200).nullable().default(null),
  person: z.string().max(120).nullable().default(null),
  description: z.string().max(2000).nullable().default(null),
  checklist: z.array(z.string().min(1).max(200)).default([]),
  reminderAt: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0.8),
  missing: z.array(z.string()).default([]), // essential fields the user should confirm
  isSuggestion: z.boolean().default(false), // true if AI invented (e.g. a workout plan)
  linkHint: z.string().nullable().default(null), // free-text: "before the meeting"
});
export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;

export const ExtractionResultSchema = z.object({
  events: z.array(ExtractedEventSchema),
  warnings: z.array(z.string()).default([]),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
