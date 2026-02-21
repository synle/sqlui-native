// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AccordionBody, AccordionHeader } from "src/frontend/components/Accordion";

const theme = createTheme();

// mock the useSetting hook to avoid needing the full provider chain
vi.mock("src/frontend/hooks/useSetting", () => ({
  useLayoutModeSetting: () => "compact",
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("AccordionBody", () => {
  test("renders nothing when expanded is false (collapsed)", () => {
    const { container } = render(
      <AccordionBody expanded={false}>
        <div>Body Content</div>
      </AccordionBody>,
    );
    expect(container.textContent).toEqual("");
  });

  test("renders children when expanded is true", () => {
    const { container } = render(
      <AccordionBody expanded={true}>
        <div>Body Content</div>
      </AccordionBody>,
    );
    expect(container.textContent).toEqual("Body Content");
  });

  test("renders multiple children when expanded", () => {
    const { container } = render(
      <AccordionBody expanded={true}>
        <div>Child 1</div>
        <div>Child 2</div>
      </AccordionBody>,
    );
    expect(container.textContent).toContain("Child 1");
    expect(container.textContent).toContain("Child 2");
  });
});

describe("AccordionHeader", () => {
  test("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    const { container } = renderWithTheme(
      <AccordionHeader expanded={true} onToggle={onToggle}>
        <span>Header Text</span>
      </AccordionHeader>,
    );
    const header = container.querySelector(".Accordion__Header") as HTMLElement;
    fireEvent.click(header);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("renders children content", () => {
    const { container } = renderWithTheme(
      <AccordionHeader expanded={true} onToggle={() => {}}>
        <span>My Header</span>
      </AccordionHeader>,
    );
    expect(container.textContent).toContain("My Header");
  });

  test("applies className to the header", () => {
    const { container } = renderWithTheme(
      <AccordionHeader expanded={true} onToggle={() => {}} className="ConnectionDescription">
        <span>Header</span>
      </AccordionHeader>,
    );
    const header = container.querySelector(".Accordion__Header");
    expect(header?.classList.contains("ConnectionDescription")).toBe(true);
  });

  test("is draggable when onOrderChange is provided", () => {
    const { container } = renderWithTheme(
      <AccordionHeader expanded={true} onToggle={() => {}} onOrderChange={() => {}}>
        <span>Draggable</span>
      </AccordionHeader>,
    );
    const header = container.querySelector(".Accordion__Header") as HTMLElement;
    expect(header.draggable).toBe(true);
  });

  test("is not draggable when onOrderChange is not provided", () => {
    const { container } = renderWithTheme(
      <AccordionHeader expanded={true} onToggle={() => {}}>
        <span>Not Draggable</span>
      </AccordionHeader>,
    );
    const header = container.querySelector(".Accordion__Header") as HTMLElement;
    expect(header.draggable).toBe(false);
  });
});
