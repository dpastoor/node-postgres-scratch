/**
 *
 * Created by devin on 2/19/16.
 */
var pg = require('pg');
var config = require('./config/dev');
console.log(JSON.stringify(config));
var connectionString = `postgres://${config.user}:${config.pw}@localhost/github`;
console.log(connectionString);
var results = [];
var people = ["dpastoor", "sunny-g", "gaearon", "ellbee", "vjd"];
//
// // Grab data from http request
//
// // Get a Postgres client from the connection pool
people.forEach((person) => {
  console.log(`connecting for ${person}`);
  pg.connect(connectionString, function(err, client, done) {
    // Handle connection errors
    console.time(`start-${person}`);
    if(err) {
      done();
      console.log(err);
      return
    }

    // SQL Query > Insert Data

    // SQL Query > Select Data
    var query = client.query(`
SELECT
  similar_count,
  repo_name,
  language,
  stargazers_count,
  sim_score
FROM (SELECT
        similar_count,
        repo_id,
        repo_name,
        language,
        stargazers_count,
        sim_score
      FROM (SELECT
              *,
              round(similar_count :: NUMERIC / stargazers_count :: NUMERIC, 4) AS sim_score
            FROM (SELECT
                    count(1) AS similar_count,
                    repo_name,
                    repo_id
                  FROM (SELECT *
                        FROM recent_stars
                          INNER JOIN (SELECT *
                                      FROM (SELECT
                                              count(1) AS USERCOUNT,
                                              actor_id,
                                              actor_login
                                            FROM recent_stars
                                              INNER JOIN (
                                                           SELECT repo_id
                                                           FROM recent_stars
                                                           WHERE actor_login = '${person}'
                                                         ) dpastoortbl USING (repo_id)
                                            GROUP BY actor_id, actor_login
                                            ORDER BY USERCOUNT DESC
                                            LIMIT 500
                                           ) similarusers
                                      WHERE actor_login != '${person}'AND actor_login != '4148') mostsimilar
                          USING (actor_id)) similarrepos
                  GROUP BY repo_name, repo_id
                  ORDER BY similar_count DESC
                  LIMIT 500) final LEFT JOIN repo_language USING (repo_id)) t
      WHERE sim_score < 1
      ORDER BY sim_score DESC
      LIMIT 100) x LEFT JOIN (SELECT repo_id
                              FROM recent_stars
                              WHERE actor_login = '${person}') y USING (repo_id)
WHERE y.repo_id IS NULL order by sim_score desc LIMIT 500
  `);

    // Stream results back one row at a time
    query.on('row', function(row) {
      results.push(row);
    });

    // After all data is returned, close connection and return results
    query.on('end', function() {
      done();
      console.log(`--------------------------------------results for: ${person}---------------------------------------------`);
      console.log(results);
      console.timeEnd(`start-${person}`);
      return
    });


  });
})
