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

		mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

		const map = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: "mapbox://styles/mapbox/dark-v11",
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
			map.addSource("yakisuna", {
				type: "vector",
				url: "mapbox://shinyaore.4ifb9oa2",
			});

			// ---- Snow Depth for Japan - 6 Hour Forecast ----
			// RasterArray tileset を raster-array source として追加
			map.addSource("snow-depth-6h", {
				// 型定義がまだ追いついてない可能性があるので any キャスト
				type: "raster-array" as any,
				url: "mapbox://mapbox.weather-jp-snowdepth",
				tileSize: 512,
			} as any);

			// raster-array を raster レイヤーで可視化
			map.addLayer({
				id: "snowdepth",
				type: "raster",
				source: "snow-depth-6h",
				"source-layer": "snowdepth", // ログに出ていたレイヤ ID

				paint: {
					// 透明度
					"raster-opacity": 0.8,
					// 値（["raster-value"]）→ 色マップ
					"raster-color": [
						"interpolate",
						["linear"],
						["raster-value"],
						0.0,
						"rgba(0,0,0,0)", // 積雪 0 は透明
						0.05,
						"#e0f2fe",
						0.2,
						"#7dd3fc",
						0.5,
						"#0ea5e9",
						1.0,
						"#0369a1",
						2.0,
						"#0b1120",
					],
					// データレンジ（だいたい 0〜数 m 程度なので 0〜2m に仮設定）
					"raster-color-range": [0, 2],
					"raster-resampling": "linear",
				} as any,
			} as any);

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
			// ---- yakisuna ポイント ----
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

			// yakisuna の範囲にフィット
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
				console.log("snow-depth-6h source loaded", map.getSource("snow-depth-6h"));
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
