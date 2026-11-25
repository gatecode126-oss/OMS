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
