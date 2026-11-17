import { PanelSkeleton } from "../../components/panels/skeleton";
import { currentLocale } from "../../lib/panels/chrome";

export default async function Loading() {
  return <PanelSkeleton locale={await currentLocale()} />;
}
