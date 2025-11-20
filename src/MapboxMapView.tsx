// MapboxMapView.tsx
import React, { useEffect, useRef } from "react";
import mapboxgl, { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type MapboxMapViewProps = {
	onFeatureClick?: (feature: mapboxgl.MapboxGeoJSONFeature | null) => void;
};

const MapboxMapView: React.FC<MapboxMapViewProps> = ({ onFeatureClick }) => {
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<MapboxMap | null>(null);

	useEffect(() => {
		if (!mapContainerRef.current) return;

		// ★ アクセストークン
		mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

		const map = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: "mapbox://styles/mapbox/dark-v11", // ダークベース
			center: [141.354046, 43.059231],
			zoom: 10,
		});

		mapRef.current = map;

		const baseCirclePaint: mapboxgl.CirclePaint = {
			"circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 12, 6, 16, 10],
			"circle-blur": 0.15,
			"circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 12, 0.85],
			"circle-stroke-color": "#020617",
			"circle-stroke-width": 0.2,
		};

		map.on("load", () => {
			console.log("Mapbox map loaded");

			// ---- yakisuna tileset ----
			// tileset ID: shinyaore.4ifb9oa2
			map.addSource("yakisuna", {
				type: "vector",
				url: "mapbox://shinyaore.4ifb9oa2",
			});
			// Snow Depth 6-hour forecast（Japan Weather Layers）
			map.addSource("snow-depth-6h", {
				type: "vector",
				tiles: [
					`https://api.mapbox.com/v4/mapbox.weather-jp-snow-6h/{z}/{x}/{y}.mvt?access_token=${mapboxgl.accessToken}`,
				],
				minzoom: 0,
				maxzoom: 12,
			});

			// ★ここは tippecanoe で作ったレイヤ名に合わせる（eniwa / muroran / sapporo）
			map.addLayer({
				id: "eniwa-circle",
				type: "circle",
				source: "yakisuna",
				"source-layer": "yakisuna_eniwa2024ndgeojson",
				paint: {
					...baseCirclePaint,
					"circle-color": "#22c55e",
				},
			});

			map.addLayer({
				id: "muroran-circle",
				type: "circle",
				source: "yakisuna",
				"source-layer": "yakisuna_muroran2024ndgeojson",
				paint: {
					...baseCirclePaint,
					"circle-color": "#38bdf8",
				},
			});

			map.addLayer({
				id: "sapporo-circle",
				type: "circle",
				source: "yakisuna",
				"source-layer": "yakisuna_sapporo2018ndgeojson",
				paint: {
					...baseCirclePaint,
					"circle-color": "#e879f9",
				},
			});
			map.addLayer({
				id: "snow-depth-6h-fill",
				type: "fill",
				source: "snow-depth-6h",
				"source-layer": "snow_depth_6h", // これが layer 名（後で説明）
				paint: {
					"fill-color": [
						"interpolate",
						["linear"],
						["get", "depth_cm"], // 属性名 = 積雪深(cm)
						0,
						"rgba(0,0,0,0)",
						1,
						"#cce4f6",
						10,
						"#7ec8f3",
						30,
						"#3ba3e6",
						50,
						"#1c69d4",
						100,
						"#0a3a8d",
					],
					"fill-opacity": 0.6,
				},
			});

			// yakisuna 範囲にフィット
			map.fitBounds(
				[
					[140.923403, 42.303748],
					[141.62192, 43.167934],
				],
				{ padding: 40 }
			);
		});

		const clickLayers = ["eniwa-circle", "muroran-circle", "sapporo-circle"];

		const handleClick = (
			e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }
		) => {
			if (!onFeatureClick) return;
			const f = e.features && e.features[0];
			if (f) onFeatureClick(f);
		};

		clickLayers.forEach((layerId) => {
			map.on("click", layerId, handleClick);
			map.on("mouseenter", layerId, () => {
				map.getCanvas().style.cursor = "pointer";
			});
			map.on("mouseleave", layerId, () => {
				map.getCanvas().style.cursor = "";
			});
		});

		map.on("error", (e) => {
			console.error("Mapbox map error:", e.error);
		});

		map.on("sourcedata", (e) => {
			if (e.sourceId === "snow-depth-6h" && e.isSourceLoaded) {
				console.log("source loaded", map.getSource("snow-depth-6h"));
			}
		});

		return () => {
			clickLayers.forEach((layerId) => {
				map.off("click", layerId, handleClick);
			});
			map.remove();
		};
	}, [onFeatureClick]);

	return (
		<div
			ref={mapContainerRef}
			style={{
				width: "100%",
				height: "100%",
				minHeight: "400px",
			}}
		/>
	);
};

export default MapboxMapView;
