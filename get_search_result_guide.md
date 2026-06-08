# `/get_search_results` 프론트엔드 개발 가이드

## 1. 목적

`/get_search_results`는 지도 화면에서 **태그명 기반 검색**을 수행하기 위한 API다.

이 API는 다음 기능을 담당한다.

- 검색어 자동완성 후보 반환
- 태그 정확 일치 검색
- 오타/띄어쓰기/자모 입력 보정
- 유사 태그 후보 제안
- AI 검색 확인 UI 유도
- 사용자가 허용한 경우 AI 기반 태그 매칭
- 검색된 태그를 가진 클러스터 반환
- 현재 지도 화면 bbox 기준 클러스터 필터링
- bbox 내 결과가 없을 때 `nearmode=false`이면 가장 가까운 태그 클러스터 반환

---

## 2. Endpoint

```
GET /v1/mx/get_search_results
```

기본 서버 예시:

```
<http://localhost:8000/v1/mx/get_search_results>
```

---

## 3. Request Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `current_query` | string | O | - | 사용자가 입력한 검색어 |
| `is_search_completed` | boolean | X | `false` | `false`: 자동완성 모드, `true`: 검색 완료 모드 |
| `do_ai_based_search` | boolean | X | `false` | 사용자가 AI 검색을 허용했는지 여부 |
| `limit` | number | X | `10` | 자동완성 후보 개수 제한 |
| `user_lat` | number | X | `null` | 사용자 현재 위도 |
| `user_lng` | number | X | `null` | 사용자 현재 경도 |
| `screen_topleft` | string | X | `null` | 현재 지도 화면 좌상단 좌표, `"lat,lng"` |
| `screen_bottomright` | string | X | `null` | 현재 지도 화면 우하단 좌표, `"lat,lng"` |
| `nearmode` | boolean | X | `null` | bbox 결과가 없을 때 가장 가까운 클러스터 fallback 여부 제어 |

좌표 예시:

```
screen_topleft=35.93,128.50
screen_bottomright=35.80,128.70
```

---

## 4. Response Schema

```json
{
  "success": true,
  "current_query": "대흐 ㄱ교",
  "is_search_completed": true,
  "do_ai_based_search": false,
  "candidates": [],
  "completed_tag": {
    "tag_id": null,
    "tag_string": "대학교",
    "confidence": 0.9,
    "is_new_tag": false
  },
  "clusters": [],
  "ai_suggested": false,
  "reason": "\\"대흐 ㄱ교\\" 검색결과가 없어 \\"대학교\\"로 검색했습니다.",
  "search_strategy": "corrected",
  "corrected_query": "대학교",
  "correction_applied": true,
  "correction_confidence": 0.9,
  "correction_candidates": [
    {
      "tag_string": "대학교",
      "confidence": 0.9
    }
  ],
  "requires_ai_confirmation": false
}
```

---

## 5. 주요 Response Fields

### `search_strategy`

프론트에서 가장 중요하게 봐야 하는 상태값이다.

| 값 | 의미 | 프론트 동작 |
| --- | --- | --- |
| `exact` | 입력어가 DB 태그와 정확히 일치 | 클러스터 렌더링 |
| `corrected` | 오타 보정이 자동 적용됨 | 안내 문구 표시 후 클러스터 렌더링 |
| `suggested` | 유사 후보는 있으나 자동 적용은 위험 | 후보 선택 UI 표시 |
| `ai_fallback` | 일반 검색/보정 실패, AI 검색 흐름 | AI 확인 또는 AI 결과 표시 |
| `not_found` | 검색 불가 또는 결과 없음 | 빈 상태 표시 |

### `completed_tag`

검색에 최종 사용된 태그.

```json
{
  "tag_string": "대학교",
  "confidence": 0.9,
  "is_new_tag": false
}
```

- `is_new_tag=false`: 기존 DB 태그
- `is_new_tag=true`: AI가 제안한 신규 태그 후보
- `completed_tag=null`: 최종 매칭 태그 없음

### `clusters`

지도에 렌더링할 클러스터 목록.

```json
{
  "longitude": 128.6014,
  "latitude": 35.8714,
  "cluster_no": 12,
  "cluster_name": "경북대학교 주변",
  "cluster_tags": ["대학교", "카페"],
  "thumbnail_url": "https://..."
}
```

프론트에서는 `latitude`, `longitude`로 마커를 찍고, `thumbnail_url`이 있으면 카드/팝업에 표시하면 된다. → 카카오맵에서 태그 검색할때처럼 리스트?

### `requires_ai_confirmation`

AI 검색 확인 UI를 띄워야 하는지 여부.

```json
"requires_ai_confirmation": true
```

이 값이 `true`이면 사용자에게 다음과 같은 UI를 보여주면 된다.

```
일치하는 태그가 없습니다. AI 기반 검색을 해볼까요?
[취소] [AI 검색]
```

---

## 6. 전체 검색 파이프라인

```
사용자 입력
  ↓
is_search_completed=false ?
  ├─ true  → 자동완성 후보 반환
  └─ false → 검색 완료 흐름

검색 완료 흐름
  ↓
1. 정확 일치 태그 검색
  ├─ 성공 → search_strategy="exact" → 클러스터 반환
  ↓
2. 정규화/오타 보정 검색
  ├─ 고확신 후보 → search_strategy="corrected" → 보정 태그로 클러스터 반환
  ├─ 애매한 후보 → search_strategy="suggested" → 후보 선택 UI
  ↓
3. 후보 없음
  ├─ do_ai_based_search=false
  │    → search_strategy="ai_fallback"
  │    → requires_ai_confirmation=true
  │    → AI 확인 UI
  │
  └─ do_ai_based_search=true
       → AI 태그 매칭 실행
       → 기존 태그 매칭 성공 시 클러스터 반환
       → 실패 시 completed_tag=null, clusters=[]
```

---

## 7. 프론트엔드 권장 상태 흐름

### 7.1 자동완성 중

사용자가 검색창에 입력 중일 때:

```
GET /v1/mx/get_search_results?current_query=대&is_search_completed=false&limit=10
```

예상 응답:

```json
{
  "candidates": ["대학교", "대구", "대형마트"],
  "clusters": [],
  "search_strategy": "exact"
}
```

프론트 동작:

- `candidates`를 자동완성 리스트로 표시
- 지도 마커는 변경하지 않아도 됨
- 사용자가 후보를 선택하거나 Enter를 누르면 검색 완료 호출

---

### 7.2 정확 일치 검색

```
GET /v1/mx/get_search_results?current_query=대학교&is_search_completed=true
```

예상 응답:

```json
{
  "search_strategy": "exact",
  "completed_tag": {
    "tag_string": "대학교",
    "is_new_tag": false
  },
  "clusters": [
    {
      "cluster_no": 1,
      "latitude": 35.87,
      "longitude": 128.60,
      "cluster_tags": ["대학교"],
      "thumbnail_url": "https://..."
    }
  ]
}
```

프론트 동작:

- `clusters`를 지도 마커로 렌더링
- 검색창에는 사용자가 입력한 `"대학교"` 유지
- 결과 리스트/카드 표시

---

### 7.3 오타 자동 보정

예: 사용자가 `"대흐 ㄱ교"` 입력

```
GET /v1/mx/get_search_results?current_query=대흐%20ㄱ교&is_search_completed=true
```

예상 응답:

```json
{
  "search_strategy": "corrected",
  "corrected_query": "대학교",
  "correction_applied": true,
  "correction_confidence": 0.9,
  "completed_tag": {
    "tag_string": "대학교",
    "confidence": 0.9,
    "is_new_tag": false
  },
  "reason": "\\"대흐 ㄱ교\\" 검색결과가 없어 \\"대학교\\"로 검색했습니다.",
  "clusters": []
}
```

프론트 동작:

- 안내 문구 표시:
    
    ```
    "대흐 ㄱ교" 검색결과가 없어 "대학교"로 검색했습니다.
    ```
    
- `clusters`를 지도에 렌더링
- 검색창을 `"대학교"`로 바꿀지는 UX 선택사항
    - 추천: 검색창에는 원 입력을 유지하고, 결과 상단에 보정 안내 표시

---

### 7.4 유사 후보 제안

예: 자동 보정하기엔 애매한 입력

예상 응답:

```json
{
  "search_strategy": "suggested",
  "completed_tag": null,
  "clusters": [],
  "correction_candidates": [
    {
      "tag_string": "학교",
      "confidence": 0.86
    },
    {
      "tag_string": "학원",
      "confidence": 0.84
    }
  ],
  "reason": "유사한 태그 후보가 있습니다."
}
```

프론트 동작:

- 지도 결과는 비우거나 이전 결과 유지 정책 선택
- 후보 선택 UI 표시:
    
    ```
    혹시 아래 태그를 찾으셨나요?
    [학교] [학원]
    ```
    
- 사용자가 후보 클릭 시:
    
    ```
    current_query=학교
    is_search_completed=true
    do_ai_based_search=false
    ```
    

---

### 7.5 AI 검색 확인 필요

예: DB 태그/오타 보정으로도 찾지 못한 입력

```
GET /v1/mx/get_search_results?current_query=ㅁㄴㅇㄹ&is_search_completed=true&do_ai_based_search=false
```

예상 응답:

```json
{
  "search_strategy": "ai_fallback",
  "completed_tag": null,
  "clusters": [],
  "requires_ai_confirmation": true,
  "reason": "일치하는 태그가 없습니다. AI 기반 유사 태그 검색을 시도할 수 있습니다."
}
```

프론트 동작:

- AI 검색 확인 UI 표시:
    
    ```
    일치하는 태그가 없습니다. AI 기반 검색을 해볼까요?
    [취소] [AI 검색]
    ```
    
- 사용자가 취소:
    - 검색 상태 초기화 또는 이전 지도 결과 유지
- 사용자가 AI 검색:
    - 같은 query로 `do_ai_based_search=true` 재호출

---

### 7.6 AI 재호출

```
GET /v1/mx/get_search_results?current_query=ㅁㄴㅇㄹ&is_search_completed=true&do_ai_based_search=true
```

가능한 응답 1: AI가 기존 태그를 찾음

```json
{
  "search_strategy": "ai_fallback",
  "ai_suggested": true,
  "completed_tag": {
    "tag_string": "대학교",
    "confidence": 0.82,
    "is_new_tag": false
  },
  "clusters": []
}
```

프론트 동작:

- `completed_tag.tag_string` 기준으로 검색 결과 표시
- `"AI가 유사한 태그를 찾았습니다."` 안내 가능

가능한 응답 2: AI도 적절한 태그를 못 찾음

```json
{
  "search_strategy": "ai_fallback",
  "ai_suggested": true,
  "completed_tag": null,
  "clusters": [],
  "requires_ai_confirmation": false,
  "reason": "AI가 적절한 태그를 찾지 못했습니다."
}
```

프론트 동작:

- 빈 결과 상태 표시
- AI 확인 버튼은 다시 띄우지 않음
- 예시 문구:
    
    ```
    검색 결과를 찾지 못했습니다.
    ```
    

가능한 응답 3: AI가 신규 태그 후보를 제안함

```json
{
  "search_strategy": "ai_fallback",
  "ai_suggested": true,
  "completed_tag": {
    "tag_string": "새로운태그",
    "confidence": 0.75,
    "is_new_tag": true
  },
  "clusters": [],
  "reason": "새로운 태그 후보입니다."
}
```

프론트 동작:

- 신규 태그는 DB 클러스터와 연결되지 않으므로 `clusters=[]`
- 추천 문구:
    
    ```
    AI가 새로운 태그 후보를 제안했지만, 연결된 장소는 아직 없습니다.
    ```
    

---

## 8. 지도 범위 필터링

검색 완료 요청에 현재 지도 bbox를 함께 보내면, 서버는 해당 화면 범위 안의 클러스터만 반환한다.

```
GET /v1/mx/get_search_results
  ?current_query=대학교
  &is_search_completed=true
  &screen_topleft=35.93,128.50
  &screen_bottomright=35.80,128.70
```

프론트 권장:

- 지도 화면이 이동/확대될 때 현재 bounds를 저장
- 검색 완료 시 bounds를 함께 전송
- 자동완성 호출에는 bounds가 꼭 필요하지 않음

---

## 9. `nearmode` 동작

bbox 안에 검색 결과가 없을 때 동작을 제어한다.

### `nearmode=true`

```
nearmode=true
```

bbox 안 결과가 없으면 빈 배열 반환.

```json
{
  "clusters": []
}
```

### `nearmode=false`

```
nearmode=false&user_lat=35.87&user_lng=128.60
```

bbox 안 결과가 없으면, 해당 태그를 가진 클러스터 중 사용자에게 가장 가까운 1개를 반환한다.

```json
{
  "clusters": [
    {
      "cluster_no": 10,
      "cluster_tags": ["대학교"]
    }
  ]
}
```

주의:

- fallback 결과도 반드시 해당 태그를 가진 클러스터다.
- `user_lat`, `user_lng`가 없으면 fallback이 동작하지 않는다.

---

## 10. 프론트 분기 기준 요약

```
if is_search_completed=false:
  candidates 표시

else if search_strategy="exact":
  clusters 렌더링

else if search_strategy="corrected":
  보정 안내 표시
  clusters 렌더링

else if search_strategy="suggested":
  correction_candidates 선택 UI 표시

else if requires_ai_confirmation=true:
  AI 검색 확인 UI 표시

else if search_strategy="ai_fallback" and ai_suggested=true:
  AI 결과 표시
  clusters가 있으면 렌더링
  clusters가 없으면 빈 결과 표시

else:
  빈 결과 표시
```

---

## 11. 권장 UI 문구

### 자동 보정

```
"{current_query}" 검색결과가 없어 "{corrected_query}"로 검색했습니다.
```

### 후보 제안

```
혹시 아래 태그를 찾으셨나요?
```

### AI 확인

```
일치하는 태그가 없습니다. AI 기반 검색을 해볼까요?
```

### AI 실패

```
AI가 적절한 태그를 찾지 못했습니다.
```

### 결과 없음

```
현재 지도 범위 안에 검색 결과가 없습니다.
```

### nearmode fallback

```
현재 화면 안에는 결과가 없어 가장 가까운 관련 장소를 표시합니다.
```

---

## 12. 테스트 케이스

| 케이스 | 요청 | 기대 결과 |
| --- | --- | --- |
| 자동완성 | `대`, `is_search_completed=false` | `candidates` 반환 |
| 정확 일치 | `대학교`, `is_search_completed=true` | `search_strategy=exact` |
| 오타 보정 | `대흐 ㄱ교`, `is_search_completed=true` | `search_strategy=corrected` |
| 후보 제안 | 애매한 오타 | `search_strategy=suggested`, `correction_candidates` |
| AI 확인 | `ㅁㄴㅇㄹ`, `do_ai_based_search=false` | `requires_ai_confirmation=true` |
| AI 재호출 | `ㅁㄴㅇㄹ`, `do_ai_based_search=true` | AI 결과 또는 실패 |
| bbox 필터 | 태그 + 지도 bbox | bbox 안 클러스터만 반환 |
| fallback 없음 | bbox 결과 없음 + `nearmode=true` | `clusters=[]` |
| fallback 있음 | bbox 결과 없음 + `nearmode=false` | 가장 가까운 태그 클러스터 1개 |

---

## 13. 주의사항

- `do_ai_based_search=true`는 첫 검색에 항상 붙이는 값이 아니다.
    - 첫 검색은 보통 `false`
    - 서버가 `requires_ai_confirmation=true`를 주면 사용자 확인 후 `true`로 재호출
- `clusters=[]`가 항상 실패를 뜻하지 않는다.
    - 신규 태그 제안
    - bbox 안 결과 없음
    - AI 매칭 실패
    - 연결된 클러스터 없음
- `thumbnail_url`이 없을 수 있다.
    - 이미지 없는 클러스터는 fallback UI 필요
- `correction_candidates`는 자동 적용되지 않은 후보다.
    - 사용자가 선택해야 한다.
- `completed_tag.is_new_tag=true`이면 DB 기존 태그가 아니므로 클러스터가 없을 수 있다.