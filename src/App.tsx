import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
if (!token) throw new Error("VITE_MAPBOX_TOKEN missing in .env");
mapboxgl.accessToken = token;

export default function App() {
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const map = new mapboxgl.Map({
			container: containerRef.current,
			style: "mapbox://styles/mapbox/streets-v12",
			center: [139.767, 35.681],
			zoom: 6,
		});

		map.addControl(new mapboxgl.NavigationControl(), "top-right");

		map.on("load", () => {
			// ← まずは確実に存在するスタイルで通す
			const tilesUrl =
				"https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=" +
				mapboxgl.accessToken;

			if (map.getLayer("wx")) map.removeLayer("wx");
			if (map.getSource("wx")) map.removeSource("wx");

			map.addSource("wx", {
				type: "raster",
				tiles: [tilesUrl],
				tileSize: 256,
			} as any);

			map.addLayer({
				id: "wx",
				type: "raster",
				source: "wx",
				paint: { "raster-opacity": 0.85 },
			});
		});

		return () => map.remove();
	}, []);

	return <div className='map-container' ref={containerRef} />;
}
