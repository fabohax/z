import { getYouTubeMetadata } from '../src/lib/youtube';

(async () => {
  const url = 'https://youtube.com/shorts/5ZqQJP-NpgM?si=6Xxx9UU4w1gQDphC';
  const metadata = await getYouTubeMetadata(url);
  // Only print the relevant fields
  console.log({ viewCountLabel: metadata.viewCountLabel, publishedAt: metadata.publishedAt });
})();
