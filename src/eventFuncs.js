import { isAlldayEvent, getSplittedDate, isRelatedToMe } from "./util";
import { logSyncedEvents } from "./calendarSync";
import { SYNC_TO, SYNC_FROM } from "./env";

/**
 * Creates an event in the user's default calendar.
 * @see https://developers.google.com/calendar/api/v3/reference/events/insert
 */
export function createEvent(_event, colorId = "10", calendarId = SYNC_TO) {
  // event details for creating event.
  let event = {
    summary: _event.summary,
    location: _event.location ? _event.location : "",
    description: _event.description ? _event.description : "",
    attendees: _event.attendees ? _event.attendees : [],
    colorId: colorId,
  };
  if (isAlldayEvent(_event)) {
    const start = new Date(_event.start.date);
    const end = new Date(_event.end.date);
    event.start = { date: getSplittedDate(start) };
    event.end = { date: getSplittedDate(end) };
  } else {
    const start = new Date(_event.start.dateTime);
    const end = new Date(_event.end.dateTime);
    event.start = { dateTime: start.toISOString() };
    event.end = { dateTime: end.toISOString() };
  }
  // Red background. Use Calendar.Colors.get() for the full list.
  try {
    // call method to insert/create new event in provided calandar
    event = Calendar.Events.insert(event, calendarId);
    Logger.log("Event ID: " + event.id);
  } catch (err) {
    Logger.log("Failed with error %s", err.message);
  }
}

export function deleteEvent(
  deletedEvent,
  syncToken,
  calendarId = SYNC_FROM,
  targetCalendarId = SYNC_TO
) {
  // deletedEventだけではstarttimeなどが分からないため_eventに詳細情報を格納
  const _event = Calendar.Events.get(calendarId, deletedEvent.id);
  const options = {
    maxResults: 10,
    syncToken: syncToken,
  };
  let start;
  let end;
  if (isAlldayEvent(_event)) {
    start = new Date(_event.start.date);
    end = new Date(_event.end.date);
  } else {
    start = new Date(_event.start.dateTime);
    end = new Date(_event.end.dateTime);
  }
  // targetCalendarIdのカレンダーから類似したイベントを取得し、delTargetEventとする
  const targetCalOptions = {
    maxResults: 10,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    q: _event.summary
  }
  const delTargetEvents = Calendar.Events.list(targetCalendarId, targetCalOptions)
  // retrievePagesに渡すcallback関数を定義
  const callbackTokenInvalid = (cal) => {};
  const callbackNoEventsFound = noEventsFoundDefault;
  const callbackCancelledEvents = (event) => {};
  const callbackAlldayEvents = ({
    delTargetEvent: delTargetEvent,
    deletedEvent: deletedEvent,
  }) => {
    try {
      Calendar.Events.remove(targetCalendarId, delTargetEvent.id);
      Logger.log("Deleted all-day event: " + delTargetEvent.summary);
    } catch (err) {
      Logger.log("Failed with error %s", err.message);
    }
  };
  const callbackNotAlldayEvents = ({
    delTargetEvent: delTargetEvent,
    deletedEvent: deletedEvent,
  }) => {
    try {
      Calendar.Events.remove(targetCalendarId, delTargetEvent.id);
      Logger.log("Deleted event: " + delTargetEvent.summary);
    } catch (err) {
      Logger.log("Failed with error %s", err.message);
    }
  };
  // delTargetEventsで得られたイベント分だけループする
  for (const delTargetEvent of delTargetEvents.items) {
    retrievePages(targetCalendarId, options, {
      tokenInvalid: callbackTokenInvalid,
      noEventsFound: callbackNoEventsFound,
      cancelledEvents: callbackCancelledEvents,
      alldayEvents: callbackAlldayEvents,
      notAlldayEvents: callbackNotAlldayEvents,
      syncToken: syncToken,
      delTargetEvent: delTargetEvent,
      deletedEvent: deletedEvent,
    });
  }
}

export function retrievePages(
  calendarId,
  options,
  {
    tokenInvalid: tokenInvalid = tokenInvalidDefault,
    noEventsFound: noEventsFound = noEventsFoundDefault,
    cancelledEvents: cancelledEvents = cancelledEventsDefault,
    alldayEvents: alldayEvents = alldayEventsDefault,
    notAlldayEvents: notAlldayEvents = notAlldayEventsDefault,
    syncToken: syncToken = null,
    delTargetEvent: delTargetEvent = null,
    deletedEvent: deletedEvent = null,
  }
) {
  // Retrieve events one page at a time.
  let events;
  let pageToken;
  do {
    try {
      options.pageToken = pageToken;
      Logger.log(options);
      events = Calendar.Events.list(calendarId, options);
    } catch (e) {
      // Check to see if the sync token was invalidated by the server;
      // if so, perform a full sync instead.
      if (
        e.message === "Sync token is no longer valid, a full sync is required."
      ) {
        tokenInvalid(calendarId);
        return;
      }
      throw new Error(e.message);
    }
    Logger.log(events);
    if (events.items && events.items.length === 0) {
      noEventsFound();
      return events;
    }
    for (const event of events.items) {
      if (event.status === "cancelled") {
        cancelledEvents(event, syncToken);
        continue;
      }
      if (!isRelatedToMe(event)) {
        Logger.log("Irelavant event skipping...: %s", event.summary);
        continue;
      }
      if (isAlldayEvent(event)) {
        alldayEvents({
          event: event,
          delTargetEvent: delTargetEvent,
          deletedEvent: deletedEvent,
        });
        continue;
      }
      notAlldayEvents({
        event: event,
        delTargetEvent: delTargetEvent,
        deletedEvent: deletedEvent,
      });
    }
    pageToken = events.nextPageToken;
  } while (pageToken);
  return events;
}

function tokenInvalidDefault(calendarId) {
  properties.deleteProperty("syncToken");
  logSyncedEvents(calendarId, true);
}

function noEventsFoundDefault() {
  Logger.log("No events found.");
}

function cancelledEventsDefault(event, syncToken) {
  Logger.log(
    "Event %s was cancelled.",
    event.summary ? event.summary : event.id
  );
  // イベントを削除する処理
  deleteEvent(event, syncToken);
}

function alldayEventsDefault({ event: event }) {
  const start = new Date(event.start.date);
  const end = new Date(event.end.date);
  Logger.log(
    "%s (%s-%s): All-day event",
    event.summary,
    start.toLocaleDateString(),
    end.toLocaleDateString()
  );
  // イベントを追加する処理
  createEvent(event, "10");
}

function notAlldayEventsDefault({ event: event }) {
  // Events that don't last all day; they have defined start times.
  const start = new Date(event.start.dateTime);
  const end = new Date(event.end.dateTime);
  Logger.log(
    "%s (%s-%s)",
    event.summary,
    start.toLocaleString(),
    end.toLocaleDateString()
  );
  // イベントを追加する処理
  createEvent(event, "10");
}
