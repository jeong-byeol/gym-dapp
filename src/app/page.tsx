'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export default function Home() {
  const { isConnected } = useAccount(); // 지갑 연결 상태 확인

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">GYM 자동화 Dapp</h1>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 주요 기능 카드들 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* 등록 카드 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">📝</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">헬스장 등록</h3>
            <p className="text-gray-600 mb-6">
              헬스장 등록 시스템입니다.
            </p>
            <Link href="/register">
              <button className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                헬스장 등록하기
              </button>
            </Link>
          </div>

          {/* 출석 카드 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">출석 관리</h3>
            <p className="text-gray-600 mb-6">
              헬스장 출석 시스템입니다.
            </p>
            <Link href="/attendance">
              <button className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                출석 체크하기
              </button>
            </Link>
          </div>

          {/* 관리자 카드 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">🏋️</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">관리자 페이지</h3>
            <p className="text-gray-600 mb-6">
              회원 관리 및 통계 시스템입니다.
            </p>
            <Link href="/admin">
              <button className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                관리자 페이지
              </button>
            </Link>
          </div>
        </div>

        {/* 지갑 연결 상태 안내 */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h4 className="text-lg font-semibold text-yellow-800 mb-2">
              🔒 지갑 연결이 필요합니다
            </h4>
            <p className="text-yellow-700">
              헬스장 시스템을 이용하시려면 먼저 지갑을 연결해주세요.
              우측 상단의 &ldquo;Connect Wallet&rdquo; 버튼을 클릭하세요.
            </p>
          </div>
        )}
      </main>
    </div>
  ); 
}
