import {assert} from 'chai';
import app from '../app';
import {ExpressDataApplication} from '@themost/express';
import {getMailer} from '@themost/mailer';

describe('Test Render Engine', () => {
    /**
     * @type ExpressDataApplication
     */
   let application;
    /**
     * @type ExpressDataContext
     */
   let context;
   before(done => {
       application = app.get(ExpressDataApplication.name);
       context = application.createContext();
       return done();
   });

   it('should render view', (done)=> {
       context.engine('.pug').render('hello', { title: 'Express' }, (err, result) => {
           if (err) {
               return done(err);
           }
           assert.isString(result);
           console.log(result);
           return done();
       });
   });

    it('should use mailer', (done)=> {
        getMailer(context).from('test@example.com').to('user1@example.com').test(true).template('hello').send({ title: 'Express' }, (err, result) => {
            if (err) {
                return done(err);
            }
            return done();
        });
    });

});
