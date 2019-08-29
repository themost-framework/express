module.exports = {
    extension: [ 'js' ],
    reporter: 'spec',
    timeout: 15000,
    ui: 'bdd',
    require: [ '@babel/register' ],
    exit: true
};
