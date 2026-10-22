/**
 * Timezone and Date Utility for RASA Sampoorna Analytics
 * Store timezone: Asia/Kolkata (IST = UTC+05:30)
 */

export const STORE_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MINUTES = 330; // +5 hours 30 minutes

export type AnalyticsDatePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  priorStartDate: Date;
  priorEndDate: Date;
  preset: AnalyticsDatePreset;
  label: string;
}

/**
 * Converts a UTC Date to an IST Date representation (adjusting clock for calculations)
 */
export function toIST(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + IST_OFFSET_MINUTES * 60000);
}

/**
 * Creates a UTC Date given Year, Month (0-indexed), Date, and IST hours, minutes, seconds
 */
export function createDateInIST(
  year: number,
  month: number,
  day: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  ms: number = 0
): Date {
  // Construct date in UTC then offset backwards by 330 minutes to match UTC storage
  const utcTime = Date.UTC(year, month, day, hours, minutes, seconds, ms);
  return new Date(utcTime - IST_OFFSET_MINUTES * 60000);
}

/**
 * Resolves a date preset into exact UTC boundaries matching IST days,
 * and automatically computes the matching prior period for comparison.
 */
export function resolveDateRange(
  preset: AnalyticsDatePreset,
  customStart?: string | Date,
  customEnd?: string | Date,
  referenceDate: Date = new Date()
): DateRange {
  const nowIST = toIST(referenceDate);
  const currentYear = nowIST.getFullYear();
  const currentMonth = nowIST.getMonth();
  const currentDate = nowIST.getDate();

  let startDate: Date;
  let endDate: Date;
  let label = "";

  switch (preset) {
    case "today": {
      startDate = createDateInIST(currentYear, currentMonth, currentDate, 0, 0, 0, 0);
      endDate = createDateInIST(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      label = "Today";
      break;
    }
    case "yesterday": {
      startDate = createDateInIST(currentYear, currentMonth, currentDate - 1, 0, 0, 0, 0);
      endDate = createDateInIST(currentYear, currentMonth, currentDate - 1, 23, 59, 59, 999);
      label = "Yesterday";
      break;
    }
    case "last_7_days": {
      startDate = createDateInIST(currentYear, currentMonth, currentDate - 6, 0, 0, 0, 0);
      endDate = createDateInIST(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      label = "Last 7 Days";
      break;
    }
    case "last_30_days": {
      startDate = createDateInIST(currentYear, currentMonth, currentDate - 29, 0, 0, 0, 0);
      endDate = createDateInIST(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      label = "Last 30 Days";
      break;
    }
    case "this_month": {
      startDate = createDateInIST(currentYear, currentMonth, 1, 0, 0, 0, 0);
      endDate = createDateInIST(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      label = "This Month";
      break;
    }
    case "last_month": {
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const daysInLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate();
      startDate = createDateInIST(lastMonthYear, lastMonth, 1, 0, 0, 0, 0);
      endDate = createDateInIST(lastMonthYear, lastMonth, daysInLastMonth, 23, 59, 59, 999);
      label = "Last Month";
      break;
    }
    case "this_year": {
      startDate = createDateInIST(currentYear, 0, 1, 0, 0, 0, 0);
      endDate = createDateInIST(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      label = "This Year";
      break;
    }
    case "custom": {
      if (!customStart || !customEnd) {
        throw new Error("Custom date range requires both startDate and endDate.");
      }
      const s = new Date(customStart);
      const e = new Date(customEnd);

      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        throw new Error("Invalid start or end date supplied.");
      }
      if (s > e) {
        throw new Error("Start date must be before or equal to end date.");
      }

      // If strings like YYYY-MM-DD were passed, align to IST full day boundaries
      if (typeof customStart === "string" && customStart.length === 10) {
        const [y, m, d] = customStart.split("-").map(Number);
        startDate = createDateInIST(y, m - 1, d, 0, 0, 0, 0);
      } else {
        startDate = s;
      }

      if (typeof customEnd === "string" && customEnd.length === 10) {
        const [y, m, d] = customEnd.split("-").map(Number);
        endDate = createDateInIST(y, m - 1, d, 23, 59, 59, 999);
      } else {
        endDate = e;
      }

      label = `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`;
      break;
    }
    default: {
      startDate = createDateInIST(currentYear, currentMonth, currentDate - 29, 0, 0, 0, 0);
      endDate = createDateInIST(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      label = "Last 30 Days";
    }
  }

  // Prior Period Calculation: Same duration immediately preceding startDate
  const durationMs = endDate.getTime() - startDate.getTime();
  const priorEndDate = new Date(startDate.getTime() - 1);
  const priorStartDate = new Date(priorEndDate.getTime() - durationMs);

  return {
    startDate,
    endDate,
    priorStartDate,
    priorEndDate,
    preset,
    label,
  };
}

/**
 * Calculates percentage change between current and prior metric:
 * ((current - prior) / prior) * 100
 */
export function calculatePercentageChange(current: number, prior: number): number | null {
  if (prior === 0) {
    return current > 0 ? 100 : current < 0 ? -100 : 0;
  }
  const change = ((current - prior) / Math.abs(prior)) * 100;
  return Math.round(change * 10) / 10;
}

/**
 * Generates continuous daily intervals between startDate and endDate
 */
export function generateDailyBuckets(startDate: Date, endDate: Date): Array<{ key: string; label: string; start: Date; end: Date }> {
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const ist = toIST(current);
    const y = ist.getFullYear();
    const m = ist.getMonth();
    const d = ist.getDate();

    const bucketStart = createDateInIST(y, m, d, 0, 0, 0, 0);
    const bucketEnd = createDateInIST(y, m, d, 23, 59, 59, 999);
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    // Month name for clean chart axis label: e.g. "12 Oct"
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = `${d} ${monthNames[m]}`;

    buckets.push({
      key,
      label,
      start: bucketStart,
      end: bucketEnd,
    });

    // Advance 1 day in IST
    current.setTime(bucketEnd.getTime() + 1);
  }

  return buckets;
}
