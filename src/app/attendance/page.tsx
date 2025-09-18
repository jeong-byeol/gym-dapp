'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract } from 'wagmi';
import { useState, useEffect } from 'react';

export default function AttendancePage() {
  const { address, isConnected } = useAccount(); // 현재 연결된 지갑 주소
  const [isCheckedIn, setIsCheckedIn] = useState(false); // 출석 체크인 상태
  const [attendanceHistory, setAttendanceHistory] = useState<string[]>([]); // 출석 기록 (임시)
  const [isLoading, setIsLoading] = useState(false); // 출석 처리 중 상태

  const { error, isPending } = useWriteContract();

  // 오늘 날짜 가져오기
  const today = new Date().toLocaleDateString('ko-KR');

  // 출석 체크인 처리 함수
  const handleCheckIn = async () => {
    if (!isConnected) {
      alert('먼저 지갑을 연결해주세요!');
      return;
    }

    if (isCheckedIn) {
      alert('이미 오늘 출석체크를 완료하셨습니다!');
      return;
    }

    try {
      setIsLoading(true);

      // 실제 구현 시에는 여기서 스마트 컨트랙트 호출
      console.log('출석 체크인 시도:', {
        address,
        timestamp: new Date(),
      });

      // 예시 - 실제로는 스마트 컨트랙트 주소와 ABI 필요
      // writeContract({
      //   address: '0x...', // 컨트랙트 주소
      //   abi: membershipABI,
      //   functionName: 'checkIn',
      //   args: [],
      // });

      // 임시로 로컬 상태 업데이트
      setIsCheckedIn(true);
      setAttendanceHistory(prev => [today, ...prev]);
      
      alert('출석체크가 완료되었습니다!');
    } catch (error) {
      console.error('출석체크 실패:', error);
      alert('출석체크 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 출석 체크아웃 처리 함수 (선택사항)
  const handleCheckOut = async () => {
    if (!isCheckedIn) {
      alert('먼저 출석체크인을 해주세요!');
      return;
    }

    try {
      setIsLoading(true);
      
      // 실제 구현 시 체크아웃 로직
      console.log('체크아웃 시도:', {
        address,
        timestamp: new Date(),
      });

      alert('체크아웃이 완료되었습니다!');
    } catch (error) {
      console.error('체크아웃 실패:', error);
      alert('체크아웃 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 시간 표시용
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 메인 출석 카드 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">헬스장 출석</h1>
              <p className="text-gray-600 mb-6">
                블록체인으로 투명하게 관리되는 출석 시스템
              </p>

              {/* 현재 시간 표시 */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600">현재 시간</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentTime.toLocaleTimeString('ko-KR')}
                </p>
                <p className="text-gray-600">{today}</p>
              </div>

              {/* 지갑 연결 버튼 */}
              <div className="mb-8">
                <ConnectButton />
              </div>

              {isConnected ? (
                <div className="space-y-6">
                  {/* 연결된 지갑 주소 표시 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">연결된 지갑</p>
                    <p className="font-mono text-sm text-gray-900 mt-1">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>

                  {/* 출석 상태 표시 */}
                  <div className={`p-6 rounded-lg ${isCheckedIn ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${isCheckedIn ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <p className="font-semibold text-lg">
                        {isCheckedIn ? '출석 완료' : '출석 대기'}
                      </p>
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-2">
                      {isCheckedIn 
                        ? '오늘 출석체크가 완료되었습니다.' 
                        : '오늘 아직 출석체크를 하지 않았습니다.'
                      }
                    </p>
                  </div>

                  {/* 출석 버튼들 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={handleCheckIn}
                      disabled={isLoading || isCheckedIn || isPending}
                      className="bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading || isPending ? '처리 중...' : '출석 체크인'}
                    </button>

                    <button
                      onClick={handleCheckOut}
                      disabled={isLoading || !isCheckedIn || isPending}
                      className="bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading || isPending ? '처리 중...' : '체크아웃'}
                    </button>
                  </div>

                  {/* 상태 메시지 */}
                  {isPending && <p className="text-center text-blue-600">트랜잭션 전송 중...</p>}
                  {error && (
                    <p className="text-center text-red-600">
                      오류: {error.message}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-600">
                  <p>출석체크를 위해 먼저 지갑을 연결해주세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 출석 기록 카드 */}
        {isConnected && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">최근 출석 기록</h2>
              
              {attendanceHistory.length > 0 ? (
                <div className="space-y-2">
                  {attendanceHistory.map((date, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900 font-medium">{date}</span>
                      <span className="text-green-600 font-semibold">✓ 출석 완료</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-600 py-8">
                  <p>아직 출석 기록이 없습니다.</p>
                  <p className="text-sm mt-2">첫 번째 출석체크를 해보세요!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
