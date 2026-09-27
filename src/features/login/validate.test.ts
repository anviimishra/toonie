import { describe, expect, it } from "vitest";
import {
  DISPLAY_NAME_MAX_LENGTH,
  checkDisplayName,
  checkEmail,
  checkPassword,
  fieldsFor,
  firstInvalidField,
  validateLogin,
} from "./validate";

const good = { email: "sam@example.com", password: "secret1", displayName: "Sam" };

describe("checkEmail", () => {
  it.each(["sam@example.com", "  sam@example.com  ", "a.b+c@mail.co.uk"])("accepts %s", (email) => {
    expect(checkEmail(email)).toBeNull();
  });

  it.each(["", "   "])("asks for an email when blank (%j)", (email) => {
    expect(checkEmail(email)).toMatch(/need your email/);
  });

  it.each(["sam", "sam@", "sam@example", "@example.com", "sam @example.com", "sam@@example.com"])(
    "rejects %s",
    (email) => {
      expect(checkEmail(email)).toMatch(/looks a little off/);
    },
  );
});

describe("checkPassword", () => {
  it("asks for a password when blank", () => {
    expect(checkPassword("")).toMatch(/password/);
  });

  it("rejects fewer than 6 characters", () => {
    expect(checkPassword("12345")).toMatch(/at least 6/);
  });

  it("accepts exactly 6 characters", () => {
    expect(checkPassword("123456")).toBeNull();
  });

  it("counts spaces, since they are part of the password", () => {
    expect(checkPassword("      ")).toBeNull();
  });
});

describe("checkDisplayName", () => {
  it.each(["", "   "])("asks for a name when blank (%j)", (name) => {
    expect(checkDisplayName(name)).toMatch(/call you/);
  });

  it("accepts a normal name", () => {
    expect(checkDisplayName("Grandma Jo")).toBeNull();
  });

  it("rejects a name too long for a panel", () => {
    expect(checkDisplayName("x".repeat(DISPLAY_NAME_MAX_LENGTH + 1))).toMatch(/under/);
    expect(checkDisplayName("x".repeat(DISPLAY_NAME_MAX_LENGTH))).toBeNull();
  });
});

describe("validateLogin", () => {
  it("passes good sign-in details", () => {
    expect(validateLogin(good, "signIn")).toEqual({});
  });

  it("does not ask for a name when signing in", () => {
    expect(validateLogin({ ...good, displayName: "" }, "signIn")).toEqual({});
  });

  it("requires a name when creating an account", () => {
    expect(validateLogin({ ...good, displayName: " " }, "signUp")).toEqual({
      displayName: expect.any(String),
    });
  });

  it("reports every problem at once", () => {
    const errors = validateLogin({ email: "nope", password: "1", displayName: "" }, "signUp");
    expect(Object.keys(errors).sort()).toEqual(["displayName", "email", "password"]);
  });
});

describe("firstInvalidField", () => {
  it("follows the on-screen order", () => {
    const errors = { password: "x", displayName: "y" };
    expect(firstInvalidField(errors, "signUp")).toBe("displayName");
    expect(firstInvalidField(errors, "signIn")).toBe("password");
  });

  it("is null when nothing is wrong", () => {
    expect(firstInvalidField({}, "signUp")).toBeNull();
  });

  it("lists the name field only when creating an account", () => {
    expect(fieldsFor("signIn")).toEqual(["email", "password"]);
    expect(fieldsFor("signUp")).toEqual(["displayName", "email", "password"]);
  });
});
