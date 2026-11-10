import { Redirect } from "expo-router";

/** Deep links and older routes land on the Feed tab. */
export default function FeedRedirect() {
  return <Redirect href="/(resident)/(tabs)/feed" />;
}
