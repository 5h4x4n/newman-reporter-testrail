# newman-reporter-testrail

Fork of a TestRail reporter for Newman (Original repo: https://github.com/billylam/newman-reporter-testrail)
I just changed the comment output in TestRail for my own purposes.

## Installation

`npm install newman-reporter-testrail --global`

## Usage

### Prefix all test assertions you wish to map with the test number.
Include the letter C. You may map more than one test case to an assertion.
```
pm.test("C226750 C226746 Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

### Export the following environment variables.

| Environment Variable | Description |
| --- | --- |
| TESTRAIL_DOMAIN | TestRail domain.  Do not include protocol. |
| TESTRAIL_USERNAME | TestRail username / email. |
| TESTRAIL_APIKEY | TestRail [API key](http://docs.gurock.com/testrail-api2/accessing#username_and_api_key). |
| TESTRAIL_PROJECTID | TestRail project id. |
| TESTRAIL_RUNID (optional) | TestRail run id.  Update a specific run instead of creating a new run.  Can use the string "latest" to update latest run. |
| TESTRAIL_SUITEID (optional) | TestRail suite id.  Mandatory in multi-suite projects.  Do not use in single-suite projects. |
| TESTRAIL_VERSION (optional) | Version of API tested. |
| TESTRAIL_TITLE (optional) | Title of test run to create. |
| TESTRAIL_INCLUDEALL (optional) | Whether to include all tests in run, regardless of whether actually run by Newman.  Defaults to true. |
| TESTRAIL_CUSTOM_* (optional) | A fixed testrail field, where * is the field key |

You can use [direnv](https://github.com/direnv/direnv) to easily maintain directory-specific options.

You may also set some or all of these variables using bash exports.

### Run newman with the reporter option
`-r testrail`

Example:

```
TESTRAIL_DOMAIN=example.testrail.com TESTRAIL_USERNAME=exampleuser 
TESTRAIL_APIKEY=yourkey TESTRAIL_PROJECTID=99 TESTRAIL_TITLE="Dev-API Regression" 
newman run my-collection.postman_collection.json -r testrail,cli
```
