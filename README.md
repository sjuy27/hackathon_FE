# Hackathon FE

React + Vite + Tailwind CSS 기반 프런트엔드 프로젝트입니다. JavaScript와 npm을 사용합니다.

## 시작하기

Node.js 24 LTS를 권장합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소로 접속합니다.

## 명령어

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드 (`dist/`)
- `npm run preview`: 빌드 결과 로컬 미리보기
- `npm run lint`: ESLint 검사

## 주요 파일

- `src/App.jsx`: 시작 화면
- `src/main.jsx`: React 진입점
- `src/index.css`: Tailwind CSS와 전역 스타일
- `vite.config.js`: React 및 Tailwind Vite 플러그인 설정

환경 변수는 `.env.local`에 작성합니다. 클라이언트에 제공할 변수는 `VITE_` 접두사를 사용하며, 브라우저에 노출되므로 비밀 키를 넣지 않습니다.
