import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from 'wagmi/chains';
import { defineChain } from 'viem';

// Klaytn Kairos 테스트넷 정의
const kairos = defineChain({
  id: 1001,
  name: 'Klaytn Testnet Kairos',
  nativeCurrency: {
    decimals: 18,
    name: 'KLAY',
    symbol: 'KLAY',
  },
  rpcUrls: {
    default: {
      http: ['https://public-en-kairos.node.kaia.io'],
      webSocket: ['wss://public-en-kairos.node.kaia.io/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Kaiascope',
      url: 'https://kairos.kaiascope.com',
      apiUrl: 'https://kairos.kaiascope.com/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 123390593,
    },
  },
  testnet: true,
});

// wagmi 설정
export const config = getDefaultConfig({
  appName: 'Gym DApp',
  projectId: 'YOUR_PROJECT_ID', // WalletConnect Cloud에서 가져온 프로젝트 ID
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    kairos, // Klaytn Kairos 테스트넷 추가
    ...(process.env.NODE_ENV === 'development' ? [sepolia] : []),
  ],
  ssr: true, // Next.js에서 서버사이드 렌더링을 위해 true로 설정
});
