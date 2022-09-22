import { logSyncedEvents } from "./calendarSync";
import { SYNC_FROM } from "./env";

global.main = () => {
    logSyncedEvents(SYNC_FROM)
}