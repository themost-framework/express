# most-data-express
MOST Data ORM Express Middleware

### Installation

    npm i @themost/express
    
### Usage

Use @themost/data application as an express middleware

    var ExpressDataApplication = require("@themost/express").ExpressDataApplication;
    // data application setup
    var dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'config'));
    // use data middleware (register req.context)
    app.use(dataApplication.middleware());