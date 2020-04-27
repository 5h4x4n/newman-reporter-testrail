/* eslint-disable no-underscore-dangle */
const request = require('sync-request');

class TestRailReporter {
  get results() {
    return this._results;
  }

  set results(results) {
    this._results = results;
  }

  constructor(emitter, reporterOptions, options) {
    this.results = [];

    emitter.on('beforeDone', (err, args) => {
      this.handleCompletion(err, args);
    });
  }

  handleCompletion(err, args) {
    this.handleTests(args.summary.run.executions);
    if (this.results.length > 0) {
      const domain = process.env.TESTRAIL_DOMAIN;
      const username = process.env.TESTRAIL_USERNAME;
      const apikey = process.env.TESTRAIL_APIKEY;
      const projectId = process.env.TESTRAIL_PROJECTID;
      const suiteId = process.env.TESTRAIL_SUITEID;
      const version = process.env.TESTRAIL_VERSION;
      const includeAll = process.env.TESTRAIL_INCLUDEALL;
      let runId = process.env.TESTRAIL_RUNID;
      let title = process.env.TESTRAIL_TITLE;
      let url = '';

      const auth = Buffer.from(`${username}:${apikey}`).toString('base64');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      };

      let response;
      // Create a title using project name if no better title is specified
      if (!title) {
        const path = (suiteId) ? `get_suite/${suiteId}` : `get_project/${projectId}`;
        response = request('GET', `https://${domain}/index.php?/api/v2/${path}`, { headers });
        if (response.statusCode >= 300) console.error(response.getBody());
        title = process.env.TESTRAIL_TITLE || `${JSON.parse(response.getBody()).name}: Automated Test Run`;
      }

      if (runId) {
        // Get first run id from get_runs if latest specified
        if (runId.toLowerCase() === 'latest') {
          response = request('GET', `https://${domain}/index.php?/api/v2/get_runs/${projectId}`, { headers });
          runId = JSON.parse(response.getBody())[0].id;
        }
        // Get url from get_run
        response = request('GET', `https://${domain}/index.php?/api/v2/get_run/${runId}`, { headers });
      } else {
      // Add a new test run if no run id was specified
        const json = {
          name: title,
          suite_id: suiteId,
        };
        // Handle include all flag
        if (includeAll !== undefined && includeAll.toLowerCase() === 'false') {
          json.include_all = false;
          json.case_ids = this.results.map((result) => result.case_id);
        }
        response = request('POST', `https://${domain}/index.php?/api/v2/add_run/${projectId}`, {
          headers,
          json,
        });
        if (response.statusCode >= 300) console.error(response.getBody());
        runId = JSON.parse(response.getBody()).id;
      }
      ({ url } = JSON.parse(response.getBody()));

      // Add results
      response = request('POST', `https://${domain}/index.php?/api/v2/add_results_for_cases/${runId}`, {
        headers,
        json: {
          results: this.results,
        },
      });
      if (response.statusCode >= 300) console.error(response.getBody());
      console.log(`\n${url}`);
    } else {
      console.error('\nnewman-reporter-testrail: No test cases were found.');
    }
  }

  handleTests(executions) {
    const testCaseRegex = /\bC(\d+)\b/;
    const customKeys = Object.keys(process.env).filter((key) => key.startsWith('TESTRAIL_CUSTOM'));

    executions.forEach((execution) => {
      if (execution.assertions) {
        execution.assertions.forEach((assertion) => {
          // Split and match instead of a regex with /g to match only
          // leading cases and not ones referenced later in the assertion
          const strings = assertion.assertion.split(' ');
          for (let i = 0; i < strings.length; i++) {
            const matches = strings[i].match(testCaseRegex);
            if (matches) {
              const { url } = execution.request;
              const lastResult = {
                case_id: matches[1],
              };

              let comment = "";
              lastResult.comments = new Set();

              if (assertion.skipped === true) {
                lastResult.status_id = 4;
              } else {

                comment = assertion.assertion.concat( ": " );

                if (assertion.error) {
                  comment = comment.concat( "FAILED\nError message: " + assertion.error.message );
                  lastResult.status_id = 5;
                } else {
                  comment = comment.concat( "PASSED" );
                  lastResult.status_id = 1;
                }

                lastResult.comments.add( comment );
              }

              if (process.env.TESTRAIL_VERSION) lastResult.version = process.env.TESTRAIL_VERSION;

              // If user has custom testrail fields, parse from process.env and push values
              if (customKeys.length) {
                customKeys.forEach((key) => {
                  const testrailKey = key.replace('TESTRAIL_CUSTOM_', '');
                  lastResult[testrailKey] = process.env[key];
                });
              }

              // If the user maps multiple matching TestRail cases,
              // we need to fail all of them if one fails
              const matchingResultIndex = this.results.findIndex((prevResult) => prevResult.case_id === lastResult.case_id);
              if (matchingResultIndex > -1) {
                this.results[matchingResultIndex].comments.add( comment );
                if (lastResult.status_id === 5 && this.results[matchingResultIndex].status_id !== 5) {
                  this.results[matchingResultIndex].status_id = 5;
                }
              } else {
                this.results.push(lastResult);
              }
            }
          }
        });
      }
    });

    // Build comment for each result in results for the transmission to TestRail
    this.results.forEach((result) => {
      result.comment = "";
      result.comments.forEach((comment) => {
        result.comment = result.comment.concat( "\n" + comment );
      });
      delete result.comments;
    });
  }
}

module.exports = TestRailReporter;
