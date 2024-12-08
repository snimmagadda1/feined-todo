import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
  ViewContainerRef,
} from '@angular/core';
import { ParsedDay, ReOrderEvent } from '../../models';
import { EventComponent } from '../event/event.component';
import { ReactiveFormsModule } from '@angular/forms';
import { EventService, RxEventDocumentType } from '../../services';
import { BehaviorSubject, Subscription } from 'rxjs';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { RxDocument } from 'rxdb';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [
    CdkDropList,
    CdkDrag,
    CommonModule,
    EventComponent,
    ReactiveFormsModule,
  ],
  template: `
    <div
      cdkDropList
      (cdkDropListDropped)="drop($event)"
      [cdkDropListData]="{ date: _day.date, list: list }"
      class="list events-body"
      *ngIf="_day$ | async; let _day"
      [style.min-height]="large ? '420px' : '160px'"
    >
      <ng-container *ngIf="list">
        <span
          cdkDrag
          [cdkDragData]="event"
          *ngFor="let event of list; let ind = index"
        >
          <app-event
            [event]="event"
            (updateForm)="addNew()"
            [index]="ind"
          ></app-event>
        </span>
      </ng-container>
      <ng-container #newEvent></ng-container>
    </div>
  `,
  styleUrl: './list.component.scss',
})
export class ListComponent implements AfterViewInit, OnDestroy {
  @Input() large = false;

  public _day$ = new BehaviorSubject<ParsedDay | null>(null);
  @Input()
  set day(day: ParsedDay) {
    this._day$.next(day);
  }

  @Input() list: RxDocument<RxEventDocumentType>[] | null = null;
  @Output() reorder = new EventEmitter<ReOrderEvent>();
  @ViewChildren(EventComponent) eventComponents!: QueryList<EventComponent>;
  @ViewChild('newEvent', { read: ViewContainerRef })
  newEvent!: ViewContainerRef;
  subscription = new Subscription();
  private _componentRef: ComponentRef<EventComponent> | null = null;
  constructor(
    public readonly eventService: EventService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    // Handle new event component metadata
    this.createEventComponent();
    this.eventComponents.changes.subscribe((_) => {
      if (!this._componentRef) return;
      this._componentRef.instance.index = this.eventComponents.length;
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  createEventComponent(): void {
    if (this.newEvent) {
      this.newEvent.clear();
      this._componentRef = this.newEvent.createComponent(EventComponent);
      this._componentRef.instance.date = this._day$.value?.date!;
      this._componentRef.instance.index = this.list?.length || 0;
      this._componentRef.instance.updateForm.subscribe(() => this.addNew());
      this.cdr.detectChanges();
    }
  }

  addNew() {
    this.createEventComponent();
    setTimeout(() => {
      this._componentRef?.instance.textInput.nativeElement.focus();
    }, 0);
  }

  // Template errors w/ type...
  drop(event: any) {
    if (!event) return;
    this.reorder.emit({
      dragged: event.item.data,
      prev: {
        container: event.previousContainer.id,
        index: event.previousIndex,
        list: event.previousContainer.data.list,
        context: {
          date: event.previousContainer.data.date,
        },
      },
      curr: {
        container: event.container.id,
        index: event.currentIndex,
        list: event.container.data.list,
        context: {
          date: event.container.data.date,
        },
      },
    });
  }
}
