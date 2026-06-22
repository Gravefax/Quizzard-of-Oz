import { describe, it, expect, beforeEach } from "vitest";
import useAuthStore from "@/app/stores/authStore";

describe("authStore", () => {
  beforeEach(() => {
	useAuthStore.setState({ credential: null });
  });

  it("starts with no credential", () => {
	expect(useAuthStore.getState().credential).toBeNull();
	expect(useAuthStore.getState().getCredential()).toBeNull();
  });

  it("stores and returns a credential", () => {
	const credential = {
	  email: "user@example.com",
	  username: "DummyUser",
	  expiresAt: 123,
	};

	useAuthStore.getState().setCredential(credential);

	expect(useAuthStore.getState().credential).toEqual(credential);
	expect(useAuthStore.getState().getCredential()).toEqual(credential);
  });

  it("allows setting credential to null", () => {
	useAuthStore.getState().setCredential({
	  email: "user@example.com",
	  username: "DummyUser",
	  expiresAt: 123,
	});

	useAuthStore.getState().setCredential(null);

	expect(useAuthStore.getState().getCredential()).toBeNull();
  });

  it("clears credential", () => {
	useAuthStore.getState().setCredential({
	  email: "user@example.com",
	  username: "DummyUser",
	  expiresAt: 123,
	});

	useAuthStore.getState().clearCredential();

	expect(useAuthStore.getState().credential).toBeNull();
	expect(useAuthStore.getState().getCredential()).toBeNull();
  });
});

