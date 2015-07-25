/**
 * @fileoverview Test case for Content Security Policy Level 2 in
 *     Web Platform Tests.
 * @author burnik@chromium.org (Kristijan Burnik)
 */

/**
 * ContentSecurityPolicyTestCase exercises all the tests for checking browser
 * behavior in regards to a set up policy and requesting resources. A single run
 * covers only a single scenario.
 * @param {object} scenario A JSON describing the test arrangement and
 *     expectation(s). Refer to /content-security-policy/csp2/csp2.spec.json for
 *     details.
 * @param {string} description The test scenario verbose description.
 * @param {SanityChecker} sanityChecker Instance of an object used to check the
 *     running scenario. Useful in debug mode. See ./sanity-checker.js.
 *     Run {@code ./tools/generate.py -h} for info on test generating modes.
 * @return {object} Object wrapping the start method used to run the test.
 */

function ContentSecurityPolicyTestCase(scenario, description, sanityChecker) {

} // ContentSecurityPolicyTestCase
