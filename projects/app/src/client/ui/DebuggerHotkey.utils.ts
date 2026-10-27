import { Platform } from "react-native";

export const DebuggerHotkey = `Mod+\\`;
export const isDebuggerHotkeyAvailable = __DEV__ && Platform.OS === `web`;
