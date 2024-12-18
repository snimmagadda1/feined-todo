import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private _user = new BehaviorSubject<User | null>(null);

  get user$() {
    return this._user.asObservable();
  }

  set user(user: User) {
    this._user.next(user);
  }
}
