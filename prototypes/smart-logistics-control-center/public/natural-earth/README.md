# Natural Earth 글로브 표면 데이터 (번들)

deck.gl `_GlobeView`의 지구 표면(국가 경계)을 그리는 **공개 도메인** 데이터.

- 파일: `countries-110m.geojson` (Natural Earth 1:110m Admin 0 – Countries, 177 features)
- 출처: Natural Earth — https://www.naturalearthdata.com/ (via nvkelso/natural-earth-vector)
- 라이선스: **Public Domain**

## 원칙 (기획서 §1/§3/§15.5)

- **오프라인 우선**: 글로브 표면·네트워크·항로는 전부 번들로 포함하고 외부 타일/실시간 피드를 호출하지 않는다.
- 런타임에 `/natural-earth/countries-110m.geojson`를 fetch해 `GeoJsonLayer`로 렌더한다(외부 호출 0).
