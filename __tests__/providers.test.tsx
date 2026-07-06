import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { Providers } from "@/providers";

describe("Providers", () => {
  it("renders children inside the Wave 1 provider shell", () => {
    const screen = render(
      <Providers>
        <Text>Contenuto app</Text>
      </Providers>,
    );

    expect(screen.getByText("Contenuto app")).toBeTruthy();
  });
});
