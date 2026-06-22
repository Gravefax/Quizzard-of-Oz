import { describe, it, expect } from "vitest";
import { cruise } from "dependency-cruiser";

/**
 * Architecture tests verify that module boundaries defined in
 * .dependency-cruiser.cjs are not violated.
 *
 * These tests intentionally use the dependency-cruiser API directly so that
 * violations are reported as test failures (not just CLI exit codes).
 */
describe("Architecture", () => {
  it("has no circular dependencies in app/", async () => {
    const result = await cruise(["app"], {
      validate: true,
      ruleSet: {
        forbidden: [
          {
            name: "no-circular",
            severity: "error",
            from: {},
            to: { circular: true },
          },
        ],
      },
      doNotFollow: { path: "node_modules" },
    });

    if (typeof result.output === "string") throw new Error(result.output);
    const errors = result.output.summary.violations.filter(
      (v) => v.rule.severity === "error"
    );

    expect(errors, `Circular dependencies found:\n${JSON.stringify(errors, null, 2)}`).toHaveLength(0);
  });

  it("components do not import directly from api routes", async () => {
    const result = await cruise(["app"], {
      validate: true,
      ruleSet: {
        forbidden: [
          {
            name: "components-not-to-api",
            severity: "error",
            from: { path: "(^|/)app/components/" },
            to: { path: "(^|/)app/api/" },
          },
        ],
      },
      doNotFollow: { path: "node_modules" },
    });

    if (typeof result.output === "string") throw new Error(result.output);
    const errors = result.output.summary.violations.filter(
      (v) => v.rule.name === "components-not-to-api"
    );

    expect(errors, `Layer violation found:\n${JSON.stringify(errors, null, 2)}`).toHaveLength(0);
  });

  it("source files do not import from test files", async () => {
    const result = await cruise(["app"], {
      validate: true,
      ruleSet: {
        forbidden: [
          {
            name: "not-to-test-from-src",
            severity: "error",
            from: {
              pathNot: ["\\.(spec|test)\\.(ts|tsx)$", "(^|/)__tests__/"],
            },
            to: {
              path: ["\\.(spec|test)\\.(ts|tsx)$", "(^|/)__tests__/"],
            },
          },
        ],
      },
      doNotFollow: { path: "node_modules" },
    });

    if (typeof result.output === "string") throw new Error(result.output);
    const errors = result.output.summary.violations.filter(
      (v) => v.rule.name === "not-to-test-from-src"
    );

    expect(errors, `Source imports test files:\n${JSON.stringify(errors, null, 2)}`).toHaveLength(0);
  });
});
