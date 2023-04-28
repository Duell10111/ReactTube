import {useYoutubeContext} from "../../context/YoutubeContext";
import {useAppData} from "../../context/AppDataContext";

export default function useAccount() {
  const youtube = useYoutubeContext();
  const {} = useAppData();
}
