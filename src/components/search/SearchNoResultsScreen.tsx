import {useTranslation} from "@/localization";
import {EmptyState} from "@/ui/components";

export function SearchNoResultsScreen() {
  const {t} = useTranslation();

  return (
    <EmptyState
      message={t("search.noResults.message")}
      title={t("search.noResults.title")}
    />
  );
}
