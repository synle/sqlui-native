// @vitest-environment jsdom
import { render } from "@testing-library/react";
import InputError from "src/frontend/components/InputError";

describe("InputError", () => {
  test("renders a hidden required input", () => {
    const { container } = render(<InputError message="Field is required" sx={{}} />);
    const input = container.querySelector("input");
    expect(input).toBeTruthy();
    expect(input?.type).toEqual("text");
    expect(input?.required).toEqual(true);
    expect(input?.value).toEqual("");
  });

  test("input is visually hidden with zero dimensions", () => {
    const { container } = render(<InputError message="Error" sx={{}} />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.style.height).toEqual("0px");
    expect(input.style.width).toEqual("0px");
    expect(input.style.position).toEqual("absolute");
  });

  test("sets custom validity on invalid event", () => {
    const { container } = render(<InputError message="Custom error message" sx={{}} />);
    const input = container.querySelector("input") as HTMLInputElement;

    // simulate the invalid event
    const event = new Event("invalid", { bubbles: true });
    input.dispatchEvent(event);

    expect(input.validationMessage).toEqual("Custom error message");
  });
});
