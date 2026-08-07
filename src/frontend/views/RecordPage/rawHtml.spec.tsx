// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router";

vi.mock("src/frontend/components/CodeEditorBox", () => ({ default: () => <div>CodeEditorBox</div> }));
vi.mock("src/frontend/components/JsonFormatData", () => ({ default: () => <div>JsonFormatData</div> }));
vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnectionById: () => ({ data: { id: "conn1", dialect: "mysql" } }),
  useGetColumns: () => ({ data: [] }),
}));
vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useActiveConnectionQuery: () => ({ query: { id: "q1", connectionId: "conn1" } }),
  useConnectionQueries: () => ({ onAddQuery: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ alert: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: vi.fn() }),
}));
vi.mock("src/common/adapters/DataScriptFactory", () => ({
  isDialectSupportCreateRecordForm: () => false,
  isDialectSupportEditRecordForm: () => false,
}));
vi.mock("src/common/adapters/AzureCosmosDataAdapter/scripts", () => ({ getInsert: vi.fn(), getUpdateWithValues: vi.fn() }));
vi.mock("src/common/adapters/AzureTableStorageAdapter/scripts", () => ({
  AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE: [],
  getInsert: vi.fn(),
  getUpdateWithValues: vi.fn(),
}));
vi.mock("src/common/adapters/CassandraDataAdapter/scripts", () => ({ getInsert: vi.fn(), getUpdateWithValues: vi.fn() }));
vi.mock("src/common/adapters/MongoDBDataAdapter/scripts", () => ({ getInsert: vi.fn(), getUpdateWithValues: vi.fn() }));
vi.mock("src/common/adapters/RelationalDataAdapter/scripts", () => ({ getInsert: vi.fn(), getUpdateWithValues: vi.fn() }));

import { EditRecordPage } from "src/frontend/views/RecordPage";

/**
 * Record values come from whatever database the user connected to, so a cell whose
 * content looks like HTML must never execute when the record is viewed.
 */
describe("RecordPage raw HTML rendering", () => {
  test("strips inline event handlers from a record value", () => {
    const { container } = render(
      <MemoryRouter>
        <EditRecordPage data={{ bio: '<div onclick="window.__pwned = true">Acme</div>' }} />
      </MemoryRouter>,
    );

    const rendered = container.querySelector(".RawHtmlRender");
    expect(rendered).not.toBeNull();
    expect(rendered?.innerHTML).toContain("Acme");
    expect(rendered?.innerHTML).not.toContain("onclick");
  });

  test("strips script tags from a record value", () => {
    const { container } = render(
      <MemoryRouter>
        <EditRecordPage data={{ bio: "<span>Globex</span><script>window.__pwned = true;</script>" }} />
      </MemoryRouter>,
    );

    const rendered = container.querySelector(".RawHtmlRender");
    expect(rendered?.innerHTML).toContain("Globex");
    expect(rendered?.innerHTML).not.toContain("script");
  });

  test("keeps safe formatting markup intact", () => {
    const { container } = render(
      <MemoryRouter>
        <EditRecordPage data={{ bio: "<b>Initech</b></b>" }} />
      </MemoryRouter>,
    );

    expect(container.querySelector(".RawHtmlRender")?.innerHTML).toContain("<b>Initech</b>");
  });
});
