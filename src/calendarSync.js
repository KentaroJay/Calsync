import { getRelativeDate } from "./util";
import { retrievePages } from "./eventFuncs";
import { SYNC_TO } from "./env";

/**
 * Retrieve and log events from the given calendar that have been modified
 * since the last sync. If the sync token is missing or invalid, log all
 * events from up to a month ago (a full sync).
 *
 * @param {string} calendarId The ID of the calender to retrieve events from.
 * @param {boolean} fullSync If true, throw out any existing sync token and
 *        perform a full sync; if false, use the existing sync token if possible.
 */
export function logSyncedEvents(calendarId = SYNC_TO, fullSync = false) {
  const properties = PropertiesService.getUserProperties();
  const options = {
    maxResults: 10,
  };
  const syncToken = properties.getProperty("syncToken");
  if (syncToken && !fullSync) {
    options.syncToken = syncToken;
  } else {
    // Sync events up to thirty days in the past.
    options.timeMin = getRelativeDate(-7, 0).toISOString();
    options.timeMax = getRelativeDate(0, 24).toISOString();
    options.singleEvents = true;
  }
  const events = retrievePages(calendarId, options, { syncToken: syncToken });
  if (events !== "undefined") {
    properties.setProperty("syncToken", events.nextSyncToken);
  }
}
