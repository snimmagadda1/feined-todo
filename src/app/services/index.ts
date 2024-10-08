import { AuthService } from './auth.service';
import { EventService } from './event.service';
import { FormService } from './form.service';
import { UserService } from './user.service';
import { WeekService } from './week.service';

export const services = [AuthService, EventService, FormService, UserService, WeekService];

export * from './auth.service';
export * from './form.service';
export * from './event.service';
export * from './user.service';
export * from './week.service';