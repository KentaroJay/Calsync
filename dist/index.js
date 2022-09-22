function main() {
}/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/calendarSync.js":
/*!*****************************!*\
  !*** ./src/calendarSync.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "logSyncedEvents": () => (/* binding */ logSyncedEvents)
/* harmony export */ });
/* harmony import */ var _util__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./util */ "./src/util.js");
/* harmony import */ var _eventFuncs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./eventFuncs */ "./src/eventFuncs.js");
/* harmony import */ var _env__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./env */ "./src/env.js");




/**
 * Retrieve and log events from the given calendar that have been modified
 * since the last sync. If the sync token is missing or invalid, log all
 * events from up to a month ago (a full sync).
 *
 * @param {string} calendarId The ID of the calender to retrieve events from.
 * @param {boolean} fullSync If true, throw out any existing sync token and
 *        perform a full sync; if false, use the existing sync token if possible.
 */
function logSyncedEvents(calendarId = _env__WEBPACK_IMPORTED_MODULE_2__.SYNC_TO, fullSync = false) {
  const properties = PropertiesService.getUserProperties();
  const options = {
    maxResults: 10,
  };
  const syncToken = properties.getProperty("syncToken");
  if (syncToken && !fullSync) {
    options.syncToken = syncToken;
  } else {
    // Sync events up to thirty days in the past.
    options.timeMin = (0,_util__WEBPACK_IMPORTED_MODULE_0__.getRelativeDate)(-7, 0).toISOString();
    options.timeMax = (0,_util__WEBPACK_IMPORTED_MODULE_0__.getRelativeDate)(0, 24).toISOString();
    options.singleEvents = true;
  }
  const events = (0,_eventFuncs__WEBPACK_IMPORTED_MODULE_1__.retrievePages)(calendarId, options, { syncToken: syncToken });
  if (events !== "undefined") {
    properties.setProperty("syncToken", events.nextSyncToken);
  }
}


/***/ }),

/***/ "./src/env.js":
/*!********************!*\
  !*** ./src/env.js ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "SYNC_FROM": () => (/* binding */ SYNC_FROM),
/* harmony export */   "SYNC_TO": () => (/* binding */ SYNC_TO)
/* harmony export */ });
const SYNC_FROM = "vdj91ohu8ignivftscanuirhf0@group.calendar.google.com"
const SYNC_TO = "kentaro.jay.takahashi@gmail.com"

/***/ }),

/***/ "./src/eventFuncs.js":
/*!***************************!*\
  !*** ./src/eventFuncs.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createEvent": () => (/* binding */ createEvent),
/* harmony export */   "deleteEvent": () => (/* binding */ deleteEvent),
/* harmony export */   "retrievePages": () => (/* binding */ retrievePages)
/* harmony export */ });
/* harmony import */ var _util__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./util */ "./src/util.js");
/* harmony import */ var _calendarSync__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./calendarSync */ "./src/calendarSync.js");
/* harmony import */ var _env__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./env */ "./src/env.js");




/**
 * Creates an event in the user's default calendar.
 * @see https://developers.google.com/calendar/api/v3/reference/events/insert
 */
function createEvent(_event, colorId = "10", calendarId = _env__WEBPACK_IMPORTED_MODULE_2__.SYNC_TO) {
  // event details for creating event.
  let event = {
    summary: _event.summary,
    location: _event.location ? _event.location : "",
    description: _event.description ? _event.description : "",
    attendees: _event.attendees ? _event.attendees : [],
    colorId: colorId,
  };
  if ((0,_util__WEBPACK_IMPORTED_MODULE_0__.isAlldayEvent)(_event)) {
    const start = new Date(_event.start.date);
    const end = new Date(_event.end.date);
    event.start = { date: (0,_util__WEBPACK_IMPORTED_MODULE_0__.getSplittedDate)(start) };
    event.end = { date: (0,_util__WEBPACK_IMPORTED_MODULE_0__.getSplittedDate)(end) };
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

function deleteEvent(
  deletedEvent,
  syncToken,
  calendarId = _env__WEBPACK_IMPORTED_MODULE_2__.SYNC_FROM,
  targetCalendarId = _env__WEBPACK_IMPORTED_MODULE_2__.SYNC_TO
) {
  // deletedEventだけではstarttimeなどが分からないため_eventに詳細情報を格納
  const _event = Calendar.Events.get(calendarId, deletedEvent.id);
  const options = {
    maxResults: 10,
    syncToken: syncToken,
  };
  let start;
  let end;
  if ((0,_util__WEBPACK_IMPORTED_MODULE_0__.isAlldayEvent)(_event)) {
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

function retrievePages(
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
      if (!(0,_util__WEBPACK_IMPORTED_MODULE_0__.isRelatedToMe)(event)) {
        Logger.log("Irelavant event skipping...: %s", event.summary);
        continue;
      }
      if ((0,_util__WEBPACK_IMPORTED_MODULE_0__.isAlldayEvent)(event)) {
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
  (0,_calendarSync__WEBPACK_IMPORTED_MODULE_1__.logSyncedEvents)(calendarId, true);
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


/***/ }),

/***/ "./src/util.js":
/*!*********************!*\
  !*** ./src/util.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getRelativeDate": () => (/* binding */ getRelativeDate),
/* harmony export */   "getSplittedDate": () => (/* binding */ getSplittedDate),
/* harmony export */   "isAlldayEvent": () => (/* binding */ isAlldayEvent),
/* harmony export */   "isRelatedToMe": () => (/* binding */ isRelatedToMe)
/* harmony export */ });
/**
 * Helper function to get a new Date object relative to the current date.
 * @param {number} daysOffset The number of days in the future for the new date.
 * @param {number} hour The hour of the day for the new date, in the time zone
 *     of the script.
 * @return {Date} The new date.
 */
function getRelativeDate(daysOffset, hour) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function isRelatedToMe(event) {
  const re = /(t\.kentaro|absent|unavailable|fusioncomp|citl|abst)/gm;
  const loweredSummary = event.summary.toLowerCase();
  return re.exec(loweredSummary) ? true : false;
}

function getSplittedDate(date) {
  return date
    .toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .join("-");
}

function isAlldayEvent(event) {
  return event.start.date ? true : false;
}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _calendarSync__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./calendarSync */ "./src/calendarSync.js");
/* harmony import */ var _env__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./env */ "./src/env.js");



__webpack_require__.g.main = () => {
    (0,_calendarSync__WEBPACK_IMPORTED_MODULE_0__.logSyncedEvents)(_env__WEBPACK_IMPORTED_MODULE_1__.SYNC_FROM)
}
})();

/******/ })()
;