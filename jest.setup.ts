import "@testing-library/react-native/matchers";

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "images" },
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
}), { virtual: true });
