import BearerStrategy from 'passport-http-bearer';
/**
 * A passport strategy for testing purposes
 */
class TestPassportStrategy  extends BearerStrategy {
    /**
     * @param {*=} user
     */
    constructor(user) {
        super({
            passReqToCallback: true,
            realm: 'Users'
        }, (req, token, done) => {
            return done(self.getUser());
        });
        const self = this;
        // set user
        this.getUser = () => {
            return user || {
                name: 'anonymous',
                authenticationType: 'none',
            }
        };
        this.name = 'bearer';
    }
    // noinspection JSUnusedGlobalSymbols
    authenticate(req) {
        const self = this;
        return self._verify(req, null, ()=> {
            return self.success(self.getUser());
        });
    }
}

export {TestPassportStrategy};