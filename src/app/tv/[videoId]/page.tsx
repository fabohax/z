import VideoPageContent from "@/components/video-page-content";


type VideoPageProps = {
  params: { videoId: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default function SavedVideoPage({ params, searchParams }: VideoPageProps) {
  const { videoId } = params;
  return <VideoPageContent videoId={videoId} searchParams={searchParams} />;
}
