import type { GeographyBucket } from "@/lib/api/contract";
import { formatCount } from "@/lib/record";

/* The enrolment distribution, drawn from the coarse buckets the geography
   endpoint returns. A household's own location never reaches this surface at
   any zoom: there is nothing here but bucket centroids and counts, and a
   bucket holding one household would be a coordinate by another name, which
   is why the endpoint does not return one. */

const WIDTH = 720;
const HEIGHT = 300;
const PAD = 24;

export function BucketMap({
  buckets,
  resolution,
}: {
  buckets: GeographyBucket[];
  resolution: number;
}) {
  if (buckets.length === 0) {
    return null;
  }

  const lons = buckets.map((bucket) => bucket.centroid[0]);
  const lats = buckets.map((bucket) => bucket.centroid[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLon = Math.max(0.0001, maxLon - minLon);
  const spanLat = Math.max(0.0001, maxLat - minLat);
  const largest = Math.max(...buckets.map((bucket) => bucket.households));

  const households = buckets.reduce((sum, bucket) => sum + bucket.households, 0);

  return (
    <figure className="stack">
      <div className="bucket-map">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          role="img"
          aria-label={`Enrolment distribution across ${buckets.length} areas`}
        >
          {buckets.map((bucket) => {
            const x =
              PAD + ((bucket.centroid[0] - minLon) / spanLon) * (WIDTH - PAD * 2);
            const y =
              HEIGHT - PAD - ((bucket.centroid[1] - minLat) / spanLat) * (HEIGHT - PAD * 2);
            const size = 10 + (bucket.households / largest) * 28;
            const half = size / 2;
            /* A hexagon, because the buckets are hexagonal. */
            const points = Array.from({ length: 6 }, (_, index) => {
              const angle = (Math.PI / 3) * index - Math.PI / 6;
              return `${(x + half * Math.cos(angle)).toFixed(1)},${(y + half * Math.sin(angle)).toFixed(1)}`;
            }).join(" ");
            return <polygon key={bucket.h3} className="bucket" points={points} />;
          })}
        </svg>
      </div>
      <figcaption className="eyebrow">
        {formatCount(households)} households across {buckets.length} areas at
        resolution {resolution}. Areas, not addresses: no household location is
        published at any zoom.
      </figcaption>
    </figure>
  );
}
