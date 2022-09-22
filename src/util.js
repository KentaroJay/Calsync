/**
 * Helper function to get a new Date object relative to the current date.
 * @param {number} daysOffset The number of days in the future for the new date.
 * @param {number} hour The hour of the day for the new date, in the time zone
 *     of the script.
 * @return {Date} The new date.
 */
export function getRelativeDate(daysOffset, hour) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

export function isRelatedToMe(event) {
  const re = /(t\.kentaro|absent|unavailable|fusioncomp|citl|abst)/gm;
  const loweredSummary = event.summary.toLowerCase();
  return re.exec(loweredSummary) ? true : false;
}

export function getSplittedDate(date) {
  return date
    .toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .join("-");
}

export function isAlldayEvent(event) {
  return event.start.date ? true : false;
}