import AlbumClient from "./AlbumClient";

export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function AlbumDetailPage() {
  return <AlbumClient />;
}
