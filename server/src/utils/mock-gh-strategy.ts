import passport from "passport";

// The reply from Github OAuth2
import user from "./gh-mock-profile";

export default class MockGHStrategy extends passport.Strategy {
  _cb: any;
  _user: any;

  constructor(name: string, cb: any) {
    super();

    // Set the default name of our strategy
    this.name = name;
    this._cb = cb;
    this._user = user;
  }

  /**
   * Authenticate a request.
   *
   * This function should call exactly one of `this.success(user, info)`, `this.fail(challenge, status)`,
   * `this.redirect(url, status)`, `this.pass()`, or `this.error(err)`.
   * See https://github.com/jaredhanson/passport-strategy#augmented-methods.
   *
   * @param {Object} req - Request.
   * @param {Object} options - The options object passed to `passport.authenticate()`.
   * @return {void}
   */
  authenticate(req: any, options: any) {
    this._cb(null, null, this._user, (err: any, user: any) => {
      this.success(user);
    });
  }
}
