// @vitest-environment jsdom
import { render, act } from "@testing-library/react";
import { vi } from "vitest";
import Timer from "src/frontend/components/Timer";

describe("Timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders null when startTime is not provided", () => {
    const { container } = render(<Timer />);
    expect(container.textContent).toEqual("");
  });

  test("renders duration when both startTime and endTime are provided", () => {
    const startTime = 1000;
    const endTime = 6000; // 5 seconds later
    const { container } = render(<Timer startTime={startTime} endTime={endTime} />);
    expect(container.textContent).toEqual("5 seconds");
  });

  test("renders '<= 1 second' for short durations", () => {
    const now = Date.now();
    const { container } = render(<Timer startTime={now} endTime={now + 500} />);
    expect(container.textContent).toEqual("<= 1 second");
  });

  test("updates display as time passes when endTime is not set", () => {
    const now = Date.now();
    const { container } = render(<Timer startTime={now} />);

    // initially should be <= 1 second
    expect(container.textContent).toEqual("<= 1 second");

    // advance time by 3 seconds - both fake timers and system time
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // After advancing 3 seconds, the interval fires 3 times and Date.now() advances
    expect(container.textContent).toEqual("3 seconds");
  });

  test("stops updating when endTime is provided after initial render", () => {
    const now = Date.now();
    const { container, rerender } = render(<Timer startTime={now} />);

    // advance time
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.textContent).toEqual("5 seconds");

    // provide endTime - should freeze the display
    rerender(<Timer startTime={now} endTime={now + 5000} />);
    expect(container.textContent).toEqual("5 seconds");

    // advance more time - should NOT update since endTime is fixed
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.textContent).toEqual("5 seconds");
  });
});
