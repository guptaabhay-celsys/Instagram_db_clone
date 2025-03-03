const app =require('./app');
const pool = require('./pool');

pool.connect({
    host: 'localhost',
    port: 5432,
    database: 'Insta_db',
    user: "postgres",
    password: "Cel12345"
})
    .then(() => {
        app().listen(4000, () => {
            console.log(`listening on port 4000`);
        });
    })
    .catch((err) => console.log(err));