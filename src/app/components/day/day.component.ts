import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  ViewContainerRef,
} from '@angular/core';
import { ParsedDay } from '../../models';
import { EventComponent } from '../event/event.component';
import { ReactiveFormsModule } from '@angular/forms';
import { EventService } from '../../services';
import {
  BehaviorSubject,
  delay,
  filter,
  first,
  map,
  Observable,
  of,
  ReplaySubject,
  Subject,
  Subscription,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';
import { RxEventDocumentType } from '../../services/db.service';
import { RxDocument } from 'rxdb';

@Component({
  selector: 'app-day',
  standalone: true,
  imports: [CommonModule, EventComponent, ReactiveFormsModule],
  template: `
    <form class="day" *ngIf="_day$ | async; let _day">
      <div class="header" [class.isCurrent]="_day.isCurrent">
        <div class="date">{{ _day.monthDigits }}.{{ _day.dayDigits }}</div>
        <div class="day-name">{{ _day.dayName }}</div>
      </div>
      <div class="events-body">
        <ng-container *ngIf="events$ | async as events">
          <app-event
            *ngFor="let event of events; let i = index"
            [event]="event"
            (updateForm)="updateForm()"
          ></app-event>
        </ng-container>
        <ng-container #newEvent></ng-container>
        <!-- <app-event
          [date]="_day.date"
          [newForm]="true"
          (updateForm)="updateForm()"
        ></app-event> -->
      </div>
    </form>
  `,
  styleUrl: './day.component.scss',
})
export class DayComponent implements OnInit, AfterViewInit, OnDestroy {
  public _day$ = new BehaviorSubject<ParsedDay | null>(null);
  public _events$: ReplaySubject<RxDocument<RxEventDocumentType>[] | null> =
    new ReplaySubject(1);
  @Input()
  set day(day: ParsedDay) {
    this._day$.next(day);
    this.eventService
      .getEventsAt$(day.date)
      .pipe(
        first(),
        tap((events) => this._events$.next(events))
      )
      .subscribe();
  }
  @ViewChildren(EventComponent) eventComponents!: QueryList<EventComponent>;
  @ViewChild('newEvent', { read: ViewContainerRef })
  newEvent!: ViewContainerRef;
  subscription = new Subscription();
  private _updateForm$ = new Subject<string | null>();
  private _componentRef: ComponentRef<EventComponent> | null = null;

  constructor(
    public readonly eventService: EventService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this._updateForm$
        .pipe(
          withLatestFrom(this._day$.asObservable()),
          switchMap(() =>
            this.eventService.getEventsAt$(this._day$.value!.date).pipe(
              first(),
              tap((events) => this._events$.next(events)),
              tap((_) => this.createEventComponent()),
              tap(() => console.log("RUNNING")),
              tap((_) => this._componentRef?.instance.textInput.nativeElement.focus())
            )
          )
        )
        .subscribe()
    );
  }

  ngAfterViewInit(): void {
    this.createEventComponent();
    this.eventComponents.changes.subscribe((change) => {});
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  createEventComponent(): void {
    this.newEvent.clear();
    this._componentRef = this.newEvent.createComponent(EventComponent);
    this._componentRef.instance.date = this._day$.value?.date!;
    this._componentRef.instance.updateForm.subscribe(() => this.updateForm());
    this.cdr.detectChanges();
  }

  updateForm() {
    this._updateForm$.next(null);
  }

  get events$() {
    return this._events$.asObservable();
  }
}
