# 💪 헬스장 자동화 시스템 DApp

블록체인 기술을 활용한 투명하고 안전한 헬스장 멤버십 및 출석 관리 시스템입니다.

## 🌟 주요 기능

- **멤버십 등록**: 블록체인에 안전하게 저장되는 멤버십 시스템
- **출석 관리**: 투명하고 자동화된 출석 체크 시스템
- **지갑 연결**: wagmi와 RainbowKit을 통한 간편한 지갑 연결
- **실시간 업데이트**: 실시간으로 확인 가능한 출석 현황

## 🚀 시작하기

### 사전 요구사항
- Node.js 18+ 
- 메타마스크 또는 호환 지갑

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 환경 설정

`.env.local` 파일을 생성하고 다음 값들을 설정하세요:

```env
# WalletConnect Project ID (선택사항)
NEXT_PUBLIC_PROJECT_ID=your_project_id_here
```

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: wagmi, viem
- **Wallet**: RainbowKit
- **State Management**: @tanstack/react-query

## 📁 프로젝트 구조

```
src/
├── abi/                    # 스마트 컨트랙트 ABI
├── app/
│   ├── attendance/         # 출석 페이지
│   ├── register/           # 등록 페이지
│   └── page.tsx           # 메인 페이지
├── components/
│   └── providers.tsx      # wagmi 및 RainbowKit 프로바이더
└── config/
    └── wagmi.ts           # wagmi 설정
```

## 🔧 개발 가이드

### 스마트 컨트랙트 연동

1. `src/abi/` 폴더에 컨트랙트 ABI 파일을 추가
2. `src/config/wagmi.ts`에서 네트워크 설정 확인
3. 각 페이지에서 `useWriteContract`, `useReadContract` 훅 사용

### 새로운 페이지 추가

Next.js App Router를 사용하므로 `src/app/` 폴더에 새 디렉토리를 생성하고 `page.tsx` 파일을 추가하세요.

## 🌐 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm start
```

Vercel, Netlify 등에서 쉽게 배포할 수 있습니다.

## 📝 라이선스

MIT License
