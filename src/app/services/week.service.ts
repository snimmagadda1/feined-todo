import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Subject, withLatestFrom } from 'rxjs';
import { Day, initWeek, ParsedDay } from '../models';
import { formatDate } from '@angular/common';
import { addDays, isToday, startOfDay, subDays } from 'date-fns';

@Injectable({
  providedIn: 'root',
})
export class WeekService {
  isInitialized = false;
  private _dayPage$ = new BehaviorSubject<Day[]>([]); // Driver for focused week
  private _currentDays$ = new BehaviorSubject<ParsedDay[]>([]); // UI friendly days
  private _direction = new Subject<string>(); // Change event

  constructor() {
    this._initializeCurrentWeek();
    this._dayPage$.asObservable().subscribe(days => {
      this._currentDays$.next(
        days.map(day => ({
          ...day,
          dayDigits: formatDate(day.date, 'dd', 'en-US'),
          dayName: formatDate(day.date, 'EEE', 'en-US'),
          monthDigits: formatDate(day.date, 'MM', 'en-US'),
        })),
      );
    });

    // Nav sub
    this._direction
      .asObservable()
      .pipe(
        withLatestFrom(this._dayPage$.asObservable()),
        map(([direction, days]) => {
          let newWeek = days;
          switch (direction) {
            case 'left': {
              const lastDayPlusOne = days[0].date;
              const endDate = startOfDay(subDays(lastDayPlusOne, 1));
              newWeek = days
                .map((_, index) => {
                  const date = startOfDay(subDays(endDate, index));
                  return {
                    date: date,
                    isCurrent: isToday(date),
                  };
                })
                .sort((a, b) => a.date.getTime() - b.date.getTime());
              return newWeek;
            }
            case 'right': {
              const lastDayMinusOne = days[6].date;
              const startDate = startOfDay(addDays(lastDayMinusOne, 1));
              newWeek = days
                .map((_, index) => {
                  const date = startOfDay(addDays(startDate, index));
                  return {
                    date: date,
                    isCurrent: isToday(date),
                  };
                })
                .sort((a, b) => a.date.getTime() - b.date.getTime());
              return newWeek;
            }
            default:
              return days;
          }
        }),
      )
      .subscribe((page: Day[]) => {
        this._dayPage$.next(page);
      });
  }

  private _initializeCurrentWeek(): void {
    const week = initWeek();
    this._dayPage$.next(week);
  }

  changeWeek(direction: string) {
    this._direction.next(direction);
  }

  get dayPage$() {
    return this._dayPage$.asObservable();
  }

  get currentDays$() {
    return this._currentDays$.asObservable();
  }
}
