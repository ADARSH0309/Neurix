export { gdriveService } from './gdrive/index.js';
export { gmailService } from './gmail/index.js';
export { gcalendarService } from './gcalendar/index.js';
export { gformsService } from './gforms/index.js';
export { gtaskService } from './gtask/index.js';
export { gsheetsService } from './gsheets/index.js';

import { gdriveService } from './gdrive/index.js';
import { gmailService } from './gmail/index.js';
import { gcalendarService } from './gcalendar/index.js';
import { gformsService } from './gforms/index.js';
import { gtaskService } from './gtask/index.js';
import { gsheetsService } from './gsheets/index.js';

export const allServices = [
  gdriveService,
  gmailService,
  gcalendarService,
  gformsService,
  gtaskService,
  gsheetsService,
];
