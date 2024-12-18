export interface IsLoggedInResponse {
  authenticated: boolean;
  user: User;
}

export interface User {
  githubId: string;
  id: string;
  name: string;
}
