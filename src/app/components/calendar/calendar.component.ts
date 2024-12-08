import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeekService } from '../../services';
import { DayComponent } from '../day/day.component';
import { CdkDrag, CdkDropListGroup } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CdkDropListGroup, CdkDrag, CommonModule, DayComponent],
  template: `
    <div class="container" cdkDropListGroup>
      <app-day
        *ngFor="let day of weekService.currentDays$ | async"
        [day]="day"
      />
    </div>
  `,
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  constructor(public readonly weekService: WeekService) {}
}
