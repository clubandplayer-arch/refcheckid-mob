import { render, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import { Text } from "react-native";
import { ToastProvider, useToast } from "@/components/ui/toast";

function ToastEmitter() {
  const { notify } = useToast();
  useEffect(() => {
    notify("Operazione completata", "success");
  }, [notify]);
  return <Text>Emitter</Text>;
}

describe("ToastProvider", () => {
  it("exposes notify and renders success/error/info messages", async () => {
    const screen = render(
      <ToastProvider>
        <ToastEmitter />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Operazione completata")).toBeTruthy();
    });
  });
});
