# Smart Logistics Browser Performance Report

- 측정일: 2026-10-18T12:26:14.678Z
- 브라우저: Playwright Chromium Desktop Chrome
- 측정 방식: Worker 시뮬레이터, 5초 rAF 샘플, 초기 2초 안정화 후 측정
- 주의: FPS와 heap은 실행 환경(GPU·창 크기·백그라운드 상태)에 따라 달라진다.

| 운송수단 | 렌더 대상 | FPS 평균 | FPS p95 | FPS 최저 | heap 시작 | heap peak | heap 종료 | viewport | DPR |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| 1,000 | 957 | 6.4 | 7.3 | 6.0 | 22.0MB | 22.0MB | 22.0MB | 1280×720 | 1 |
| 5,000 | 4,769 | 5.2 | 5.9 | 4.8 | 22.0MB | 22.0MB | 22.0MB | 1280×720 | 1 |

## 실행 조건

- userAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.96 Safari/537.36
- hardwareConcurrency: 22
- deviceMemory: 16GB

