// oxlint-disable-next-line no-restricted-imports
import { Path as BasePath } from "react-native-svg";
import { withUniwind } from "uniwind";

export const SvgPath = withUniwind(BasePath, {
  fill: {
    fromClassName: `fillClassName`,
    styleProperty: `accentColor`,
  },
  stroke: {
    fromClassName: `strokeClassName`,
    styleProperty: `accentColor`,
  },
});
