// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

vi.mock("src/frontend/components/MigrationBox", () => ({
  default: ({ mode }: { mode: string }) => <div data-testid="migration-box">{mode}</div>,
}));

import {
  RealConnectionMigrationMigrationForm,
  RawJsonMigrationForm,
} from "src/frontend/components/MigrationForm";

describe("MigrationForm", () => {
  test("RealConnectionMigrationMigrationForm renders MigrationBox in real_connection mode", () => {
    const { getByTestId } = render(<RealConnectionMigrationMigrationForm />);
    expect(getByTestId("migration-box").textContent).toBe("real_connection");
  });

  test("RawJsonMigrationForm renders MigrationBox in raw_json mode", () => {
    const { getByTestId } = render(<RawJsonMigrationForm />);
    expect(getByTestId("migration-box").textContent).toBe("raw_json");
  });
});
