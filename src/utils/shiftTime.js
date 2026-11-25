/**
 * Shift-time helpers. The office shift comes from
 * System Settings → Attendance (attendanceRules.startTime / endTime, "HH:mm" 24h).
 */

// "HH:mm" -> minutes since midnight (fallback when missing/invalid)
export const hhmmToMinutes = (value, fallback = null) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const hrs = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  if (isNaN(hrs) || isNaN(mins) || hrs > 23 || mins > 59) return fallback;
  return hrs * 60 + mins;
};

// minutes since midnight -> "hh:mm AM/PM"
export const minutesTo12h = (total) => {
  const t = ((total % 1440) + 1440) % 1440;
  const h24 = Math.floor(t / 60);
  const m = t % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

/**
 * Resolve the configured shift window.
 * @returns {{ startMins:number, endMins:number, isOvernight:boolean, startLabel:string, endLabel:string, label:string }}
 */
export const getShiftWindow = (attendanceRules) => {
  const startMins = hhmmToMinutes(attendanceRules?.startTime, 9 * 60);
  const endMins = hhmmToMinutes(attendanceRules?.endTime, 18 * 60);
  const startLabel = minutesTo12h(startMins);
  const endLabel = minutesTo12h(endMins);
  return {
    startMins,
    endMins,
    // End at or before start means the shift runs past midnight
    isOvernight: endMins <= startMins,
    startLabel,
    endLabel,
    label: `${startLabel} - ${endLabel}`
  };
};

// Timings the app used to auto-fill for a "Morning Shift" before it read System Settings.
// An employee still holding one of these never chose a custom timing — they are on the office shift.
const BUILT_IN_DEFAULT_SHIFTS = new Set([
  '09:30 am - 06:00 pm',
  '09:00 am - 06:00 pm',
  'morning (09:00 am - 06:00 pm)'
]);

const isOfficeShiftType = (shiftType) => !shiftType || shiftType === 'Morning Shift';

/**
 * True when the employee follows the office shift from System Settings
 * (standard/Morning shift with no custom timing of their own).
 */
export const followsOfficeShift = (emp) => {
  if (!emp || emp.workMode === 'WFH') return false;
  if (!isOfficeShiftType(emp.shiftType)) return false;
  const timing = String(emp.shiftTiming || emp.shift || '').trim().toLowerCase();
  return !timing || BUILT_IN_DEFAULT_SHIFTS.has(timing);
};

/**
 * The shift timing to show for an employee: the office shift from System Settings
 * unless the employee has their own (Evening/Night/Flexible or a custom timing).
 */
export const resolveEmployeeShift = (emp, attendanceRules) => {
  if (followsOfficeShift(emp)) return getShiftWindow(attendanceRules).label;
  return emp?.shiftTiming || emp?.shift || '';
};
