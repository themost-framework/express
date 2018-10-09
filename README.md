# most-data-express
MOST Data ORM Express Middleware

### Installation

    npm i @themost/express
    
### Usage

Use @themost/data application as an express middleware

    var ExpressDataApplication = require("@themost/express").ExpressDataApplication;
    // data application setup
    var dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'config'));
    // use data application middleware
    app.use(dataApplication.middleware());
    
