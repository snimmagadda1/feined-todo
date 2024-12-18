import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  providers: [],
  template: `
    <div class="login">
      <div class="header">
        <h3>Logging in is optional!</h3>
        <h4>This is just to persist your TODOs across devices.</h4>
      </div>
      <div class="login-options">
        <button (click)="loginWithGithub()">
          <img src="/github-mark.svg" alt="Github" /> Login with Github
        </button>
        <p class="coming-soon">Alternate options coming soon...</p>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  constructor(private readonly authService: AuthService) {}

  loginWithGithub() {
    this.authService.initiateGithubAuth();
  }
}
