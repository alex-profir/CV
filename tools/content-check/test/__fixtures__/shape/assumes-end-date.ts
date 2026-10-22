import { resume } from '@cv/content';

const job = resume.work?.[0];
export const year = job?.endDate.slice(0, 4);
