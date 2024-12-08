import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ParsedDay, ReOrderEvent } from '../../models';
import { ReactiveFormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  Observable,
  Subject,
  Subscription,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { ListComponent } from '../list/list.component';
import { EventService, RxEventDocumentType } from '../../services';
import { RxDocument } from 'rxdb';
import { formatISO, startOfDay } from 'date-fns';

@Component({
  selector: 'app-day',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ListComponent],
  template: `
    <form class="day" *ngIf="_day$ | async; let _day">
      <div class="header" [class.isCurrent]="_day.isCurrent">
        <div class="date">{{ _day.monthDigits }}.{{ _day.dayDigits }}</div>
        <div class="day-name">{{ _day.dayName }}</div>
      </div>
      <app-list
        [day]="_day"
        [list]="list$ | async"
        (reorder)="reorder($event)"
        [large]="true"
      />
    </form>
  `,
  styleUrl: './day.component.scss',
})
export class DayComponent implements OnInit, OnDestroy {
  public _day$ = new BehaviorSubject<ParsedDay | null>(null);
  @Input()
  set day(day: ParsedDay) {
    this._day$.next(day);
  }
  subscription = new Subscription();
  events$ = new Observable<RxDocument<RxEventDocumentType>[] | null>();
  _list$ = new BehaviorSubject<RxDocument<RxEventDocumentType>[]>([]);
  list$ = this._list$.asObservable(); // set debounce during init to avoid flicker
  _refresh$ = new Subject<void>();
  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly eventService: EventService
  ) {}

  async ngOnInit() {
    // Initial load
    this.day$
      .pipe(
        switchMap((day) => this.eventService.getDayStream$(day?.date)),
        tap((events) =>
          console.log(
            'Events loaded for day',
            this._day$.value?.date,
            events
          )
        ),
        take(1),
        tap((events) => this._list$.next(events || []))
      )
      .subscribe();

    // Refresh from moveTo/moveFrom
    this.subscription.add(
      combineLatest([
        this.eventService.prevDayRefresh$,
        this.eventService.dayRefresh$,
      ])
        .pipe(
          filter(
            ([prev, curr]) =>
              prev === this._day$.value?.date || curr === this._day$.value?.date
          ),
          switchMap((day) =>
            this.eventService.getDayStream$(this._day$.value!.date)
          ),
          tap((events) =>
            console.log(
              'Events refreshed for day',
              this._day$.value?.date,
              events
            )
          ),
          tap((events) => this._list$.next(events || []))
        )
        .subscribe()
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async reorder(event: ReOrderEvent) {
    if (event.prev.container !== event.curr.container) {
      await event.dragged?.incrementalPatch({
        date: formatISO(startOfDay(event.curr.context.date)),
      });
      // If no list, then add event and update index
      if (!event.curr.list) {
        await event.dragged?.incrementalPatch({ index: event.curr.index }); // TODO: maybe explicit 0
      } else {
        // Remove from previous, put in new, update both indices
        const previousList = [...event.prev.list];
        previousList.splice(event.prev.index, 1);
        const currentList = [...event.curr.list];
        currentList.splice(event.curr.index, 0, event.dragged);
        const prevUpdates = previousList.map((doc, index) =>
          doc.incrementalPatch({ index })
        );
        const currUpdates = currentList.map((doc, index) =>
          doc.incrementalPatch({ index })
        );
        await Promise.all([...prevUpdates, ...currUpdates]);
        this.eventService.prevDayRefresh$ = event.prev.context.date;
      }
    } else {
      // within container drag
      const list = [...event.curr.list];
      const [removed] = list.splice(event.prev.index, 1);
      list.splice(event.curr.index, 0, removed);
      await Promise.all(
        list.map((doc, index) => doc.incrementalPatch({ index }))
      );
    }
    this.eventService.dayRefresh$ = this._day$.value!.date;
  }

  get day$() {
    return this._day$.asObservable().pipe(filter((day) => !!day));
  }

  get refresh$() {
    return this._refresh$.asObservable();
  }
}
