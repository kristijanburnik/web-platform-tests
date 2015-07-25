// TODO(kristijanburnik): This entire file should be adjusted for CSP2 checks.

// The SanityChecker is used in debug mode to identify problems with the
// structure of the testsuite and to force early test failures.
// In release mode it is mocked out to do nothing.
function SanityChecker()  {}

SanityChecker.prototype.checkScenario = function(scenario, resourceInvoker) {
  // Check if scenario is valid.
  test(function() {
    var expectedFields = Object.keys(SCHEMA_JSON["#scenario_schema"]);

    for (var field in expectedFields) {
      assert_own_property(scenario, field,
                          "The scenario should contain field '" + field + "'.")

      var expectedFieldList = expectedFields[field];
      if (!expectedFieldList.hasOwnProperty('length')) {
        var expectedFieldList = [];
        for (var key in expectedFields[field]) {
          expectedFieldList = expectedFieldList.concat(expectedFields[field][key])
        }
      }
      assert_in_array(scenario[field], expectedFieldList,
                      "Scenario's " + field + " is one of: " +
                      expectedFieldList.join(", ")) + "."
    }

    // Check if the protocol is matched.
    assert_equals(scenario["source_scheme"] + ":", location.protocol,
                  "Protocol of the test page should match the scenario.")

  }, "[ContentSecurityPolicyTestCase] The test scenario should be valid.");
}

// For easier debugging runs, we can fail a test earlier.
SanityChecker.prototype.setFailTimeout = function(test, timeout) {
  // Due to missing implementations, tests time out, so we fail them early.
  // TODO(kristijanburnik): Once WPT rolled in:
  //   https://github.com/w3c/testharness.js/pull/127
  // Refactor to make use of step_timeout.
  setTimeout(function() {
    test.step(function() {
      assert_equals(test.phase, test.phases.COMPLETE,
                    "Expected test to complete.");
      test.done();
    })
  }, timeout || 1000);
}
