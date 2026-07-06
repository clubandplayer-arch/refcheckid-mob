import { fireEvent, render } from "@testing-library/react-native";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";

describe("Wave 1 UI states", () => {
  it("renders the loading skeleton", () => {
    const screen = render(<SkeletonBlock />);
    expect(screen.getByTestId("skeleton-block")).toBeTruthy();
  });

  it("renders an empty state message", () => {
    const screen = render(<EmptyState message="Nessun dato disponibile." />);
    expect(screen.getByText("Nessun dato disponibile.")).toBeTruthy();
  });

  it("renders API errors with retry when provided", () => {
    const onRetry = jest.fn();
    const screen = render(<ErrorState message="Errore di rete" onRetry={onRetry} />);

    expect(screen.getByText("Errore API")).toBeTruthy();
    expect(screen.getByText("Errore di rete")).toBeTruthy();
    fireEvent.press(screen.getByText("Riprova"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
