import {GridFeedPhone} from "@/components/grid/GridFeedPhone";
import {YTLibrarySection} from "@/extraction/Types";
import useLibrarySection from "@/hooks/useLibrarySection";

interface LibraryDetailsPageProps {
  section: YTLibrarySection;
}

export function LibraryDetailsPage({section}: LibraryDetailsPageProps) {
  const {data, fetchMore} = useLibrarySection(section);

  return <GridFeedPhone items={data} />;
}
