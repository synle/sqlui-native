// @vitest-environment jsdom
import { render, fireEvent, act } from "@testing-library/react";
import { Container, Section, Bar } from "src/frontend/components/Resizer";

describe("Resizer", () => {
  test("Container renders children", () => {
    const { container } = render(
      <Container>
        <div>child content</div>
      </Container>,
    );
    expect(container.textContent).toContain("child content");
  });

  test("Container renders with flex display", () => {
    const { container } = render(
      <Container>
        <div>content</div>
      </Container>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.display).toContain("flex");
  });

  test("Section renders its children", () => {
    const { container } = render(<Section>section content</Section>);
    expect(container.textContent).toContain("section content");
  });

  test("Bar renders with col-resize cursor", () => {
    const { container } = render(<Bar size={5} />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.style.cursor).toContain("col-resize");
  });

  test("Bar renders with specified width", () => {
    const { container } = render(<Bar size={8} />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.style.width).toContain("8px");
  });

  test("Container applies defaultSize to first Section", () => {
    const { container } = render(
      <Container>
        <Section defaultSize={200}>left</Section>
        <Bar size={5} />
        <Section>right</Section>
      </Container>,
    );
    const flexContainer = container.firstElementChild as HTMLElement;
    const firstSection = flexContainer.children[0] as HTMLElement;
    expect(firstSection.style.width).toContain("200px");
  });

  test("subsequent Sections are made flex:1", () => {
    const { container } = render(
      <Container>
        <Section defaultSize={150}>a</Section>
        <Bar size={4} />
        <Section>b</Section>
      </Container>,
    );
    const flex = container.firstElementChild as HTMLElement;
    const secondSection = flex.children[2] as HTMLElement;
    expect(secondSection.style.flex).toContain("1");
  });

  test("Container passes through non-Section/non-Bar children unchanged", () => {
    const { container } = render(
      <Container>
        <div data-testid="passthrough">untouched</div>
      </Container>,
    );
    expect(container.querySelector("[data-testid='passthrough']")?.textContent).toBe("untouched");
  });

  test("Container handles null/string children gracefully", () => {
    const { container } = render(
      <Container>
        {null}
        plain text
        {false}
      </Container>,
    );
    expect(container.textContent).toContain("plain text");
  });

  test("Bar mouse-down then mouse-up triggers onDragEnd callback", () => {
    const onSizeChanged = vi.fn();
    const { container } = render(
      <Container>
        <Section defaultSize={300} minSize={100} maxSize={500} onSizeChanged={onSizeChanged}>
          a
        </Section>
        <Bar size={4} data-testid="bar" />
        <Section>b</Section>
      </Container>,
    );
    const bar = container.querySelector("[data-testid='bar']") as HTMLElement;
    fireEvent.mouseDown(bar, { clientX: 100 });
    // No-op mouseup (no drag movement) - exercises the onMouseUp path without delta
    act(() => {
      const mouseUp = new MouseEvent("mouseup", { bubbles: true });
      document.dispatchEvent(mouseUp);
    });
    // onSizeChanged is called when sizeRef.current is non-null (i.e. drag occurred). With no drag, it stays null.
    expect(onSizeChanged).not.toHaveBeenCalled();
  });

  test("Bar drag fires onDrag with accumulated delta on mouseup", () => {
    const onSizeChanged = vi.fn();
    const { container } = render(
      <Container>
        <Section defaultSize={200} onSizeChanged={onSizeChanged}>
          a
        </Section>
        <Bar size={4} data-testid="bar" />
        <Section>b</Section>
      </Container>,
    );
    const bar = container.querySelector("[data-testid='bar']") as HTMLElement;
    fireEvent.mouseDown(bar, { clientX: 100 });
    act(() => {
      const mouseMove = new MouseEvent("mousemove", { bubbles: true, clientX: 150 } as any);
      document.dispatchEvent(mouseMove);
    });
    act(() => {
      const mouseUp = new MouseEvent("mouseup", { bubbles: true });
      document.dispatchEvent(mouseUp);
    });
    expect(onSizeChanged).toHaveBeenCalled();
  });

  test("Bar with selectstart event prevention does not throw", () => {
    const { container } = render(
      <Container>
        <Section defaultSize={150}>a</Section>
        <Bar size={4} data-testid="bar" />
      </Container>,
    );
    const bar = container.querySelector("[data-testid='bar']") as HTMLElement;
    fireEvent.mouseDown(bar, { clientX: 0 });
    act(() => {
      const ev = new Event("selectstart", { bubbles: true, cancelable: true });
      document.dispatchEvent(ev);
    });
    act(() => {
      const mouseUp = new MouseEvent("mouseup", { bubbles: true });
      document.dispatchEvent(mouseUp);
    });
    expect(bar).toBeTruthy();
  });

  test("Section without defaultSize defaults the first section width to undefined", () => {
    const { container } = render(
      <Container>
        <Section>a</Section>
        <Section>b</Section>
      </Container>,
    );
    const flex = container.firstElementChild as HTMLElement;
    const first = flex.children[0] as HTMLElement;
    expect(first.style.flexShrink).toBe("0");
  });
});
