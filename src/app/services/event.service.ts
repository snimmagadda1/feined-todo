import { Injectable } from '@angular/core';
import { filter, map, Observable, of, Subject } from 'rxjs';
import { RxDocument } from 'rxdb';
import { formatISO, parseISO, startOfDay } from 'date-fns';
import { DbService, RxEventDocumentType } from './db.service';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  public events$: Observable<RxDocument<RxEventDocumentType, {}>[]> = of([]);

  private _dayRefresh$ = new Subject<Date>();
  private _prevDayRefresh$ = new Subject<Date>();

  constructor(private dbService: DbService) {
    this.events$ = this.dbService.db.events.find({
      sort: [{ index: 'asc' }],
    }).$;
  }

  getDayStream$(
    date: Date
  ): Observable<RxDocument<RxEventDocumentType>[] | null> {
    return this.dbService.db.events.find({
      selector: {
        date: {
          $eq: formatISO(startOfDay(date)),
        },
      },
      sort: [{ index: 'asc' }],
    }).$;
  }

  getEventsAt$(
    date: Date
  ): Observable<RxDocument<RxEventDocumentType>[] | null> {
    return this.events$.pipe(
      map((events) => {
        const res = events.filter((event) => {
          const eventDate = startOfDay(parseISO(event.date));
          return eventDate.getTime() === date.getTime();
        });
        return res.length === 0 ? null : res;
      }),
      filter((events) => !!events)
    );
  }
  get dayRefresh$(): Observable<Date> {
    return this._dayRefresh$.asObservable();
  }

  set dayRefresh$(date: Date) {
    this._dayRefresh$.next(date);
  }

  get prevDayRefresh$(): Observable<Date> {
    return this._prevDayRefresh$.asObservable();
  }

  set prevDayRefresh$(date: Date) {
    this._prevDayRefresh$.next(date);
  }
}
