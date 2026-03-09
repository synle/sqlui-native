// @vitest-environment jsdom
import { render } from "@testing-library/react";
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
});
