'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract } from 'wagmi';
import { useState, useEffect, useRef, useCallback } from 'react';
import QrScanner from 'qr-scanner';
import { getUserByWalletAddress, checkInUser, updatePTSession } from '@/lib/supabase';

export default function AttendancePage() {
  const { address, isConnected } = useAccount(); // 현재 연결된 지갑 주소 (선택적 표시용)
  const [attendanceHistory, setAttendanceHistory] = useState<string[]>([]); // 출석 기록 (임시)
  const [isLoading, setIsLoading] = useState(false); // 출석 처리 중 상태
  const [isScanning, setIsScanning] = useState(false); // QR 스캐닝 상태
  const [scanResult, setScanResult] = useState<string>(''); // QR 스캔 결과
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  const { error, isPending } = useWriteContract();

  // 오늘 날짜 가져오기
  const today = new Date().toLocaleDateString('ko-KR');

  // QR 스캐너 실제 시작 함수 (useCallback으로 메모이제이션)
  const initializeScanner = useCallback(async () => {
    if (!videoRef.current) {
      console.error('Video element still not found, retrying...');
      // video 엘리먼트가 아직 없으면 잠시 후 재시도
      setTimeout(initializeScanner, 100);
      return;
    }

    try {
      console.log('QR 스캐너 초기화 시작...');
      
      // 맥북의 내장 카메라에 맞게 설정 수정
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR 스캔 결과:', result.data);
          handleQRScanResult(result.data);
          stopScanning();
        },
        {
          // 맥북에서는 기본 카메라 사용 (preferredCamera 제거)
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        }
      );

      console.log('QR Scanner 객체 생성 완료, 시작 중...');
      await qrScannerRef.current.start();
      console.log('QR Scanner 시작 성공!');
      
    } catch (error) {
      console.error('QR 스캐너 시작 실패:', error);
      setIsScanning(false);
      
      // 더 구체적인 에러 메시지
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('카메라 접근 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
        } else if (error.name === 'NotFoundError') {
          alert('카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.');
        } else {
          alert(`카메라 오류: ${error.message}`);
        }
      } else {
        alert('카메라 접근 중 알 수 없는 오류가 발생했습니다.');
      }
    }
  }, [setScanResult, setIsScanning]); // eslint-disable-line react-hooks/exhaustive-deps

  // QR 스캐너 중지 함수
  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  // QR 스캔 결과 처리 함수
  const handleQRScanResult = async (scannedData: string) => {
    try {
      setIsLoading(true);
      
      // 디버깅: 스캔된 원본 데이터 확인
      console.log('=== QR 스캔 결과 디버깅 ===');
      console.log('원본 스캔 데이터:', JSON.stringify(scannedData));
      console.log('데이터 길이:', scannedData.length);
      console.log('데이터 타입:', typeof scannedData);
      
      // 공백 제거 및 정리
      const cleanedData = scannedData.trim();
      console.log('정리된 데이터:', JSON.stringify(cleanedData));
      console.log('정리된 데이터 길이:', cleanedData.length);
      
      // 지갑 주소 추출 함수 (다양한 형식 지원)
      const extractWalletAddress = (data: string): string | null => {
        console.log('지갑 주소 추출 시작:', data);
        
        // 1. 순수한 지갑 주소 형식: 0x...
        const pureAddressPattern = /^0x[a-fA-F0-9]{40}$/i;
        if (pureAddressPattern.test(data)) {
          console.log('순수한 지갑 주소 형식 감지');
          return data;
        }
        
        // 2. EIP-681 형식: ethereum:0x...
        const eip681Pattern = /^ethereum:(0x[a-fA-F0-9]{40})$/i;
        const eip681Match = data.match(eip681Pattern);
        if (eip681Match) {
          console.log('EIP-681 형식 감지:', eip681Match[1]);
          return eip681Match[1];
        }
        
        // 3. 기타 형식에서 지갑 주소 추출 시도
        const addressPattern = /0x[a-fA-F0-9]{40}/i;
        const addressMatch = data.match(addressPattern);
        if (addressMatch) {
          console.log('패턴 매칭으로 지갑 주소 추출:', addressMatch[0]);
          return addressMatch[0];
        }
        
        console.log('지갑 주소 추출 실패');
        return null;
      };
      
      // 지갑 주소 추출
      const extractedAddress = extractWalletAddress(cleanedData);
      console.log('추출된 지갑 주소:', extractedAddress);
      
      if (!extractedAddress) {
        console.error('지갑 주소 추출 실패한 데이터:', cleanedData);
        alert(`올바른 지갑 주소 QR 코드가 아닙니다.\n스캔된 데이터: ${cleanedData}\n길이: ${cleanedData.length}\n\n지원되는 형식:\n- 0x1234...\n- ethereum:0x1234...`);
        return;
      }

      console.log('검증된 지갑 주소:', extractedAddress);
      
      // QR 스캔 결과 표시 (추출된 주소로 설정)
      setScanResult(extractedAddress);

      // 지갑 주소로 사용자 조회 (추출된 주소 사용)
      console.log('=== 사용자 조회 시작 ===');
      const user = await getUserByWalletAddress(extractedAddress);
      console.log('사용자 조회 결과:', user);
      
      if (!user) {
        console.error('등록되지 않은 사용자:', extractedAddress);
        alert(`등록되지 않은 사용자입니다.\n지갑 주소: ${extractedAddress}\n먼저 등록해주세요.`);
        return;
      }

      console.log('조회된 사용자 정보:', {
        id: user.id,
        name: user.name,
        membership_type: user.membership_type,
        remain_session: user.remain_session
      });

      // 멤버십 유형에 따른 처리
      if (user.membership_type === 'free') {
        console.log('=== 자유이용권 출석 처리 시작 ===');
        try {
          // 자유이용권: 출석 기록 저장
          const attendanceResult = await checkInUser(user.id);
          console.log('출석 기록 저장 성공:', attendanceResult);
          
          setAttendanceHistory(prev => [today, ...prev]);
          alert(`${user.name}님 출석체크가 완료되었습니다! (자유이용권)`);
        } catch (attendanceError) {
          console.error('출석 기록 저장 실패:', attendanceError);
          throw attendanceError;
        }
      } else if (user.membership_type === 'pt') {
        console.log('=== PT이용권 세션 차감 시작 ===');
        try {
          // PT이용권: 세션 차감
          const updatedUser = await updatePTSession(user.id);
          console.log('PT 세션 차감 성공:', updatedUser);
          
          const remainingSessions = updatedUser[0]?.remain_session || 0;
          alert(`${user.name}님 PT 세션이 차감되었습니다! (남은 세션: ${remainingSessions}회)`);
        } catch (sessionError) {
          console.error('PT 세션 차감 실패:', sessionError);
          throw sessionError;
        }
      } else {
        console.error('알 수 없는 멤버십 유형:', user.membership_type);
        alert('알 수 없는 멤버십 유형입니다.');
        return;
      }

    } catch (error) {
      console.error('QR 출석 처리 실패:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('이미 오늘 출석체크')) {
          alert('이미 오늘 출석체크를 완료했습니다.');
        } else if (error.message.includes('남은 PT 세션이 없습니다')) {
          alert('남은 PT 세션이 없습니다. 세션을 추가로 구매해주세요.');
        } else {
          alert(`출석 처리 중 오류가 발생했습니다: ${error.message}`);
        }
      } else {
        alert('출석 처리 중 알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // QR 스캐너 시작 버튼 함수
  const handleCheckIn = async () => {
    console.log('출석 체크인 버튼 클릭됨');
    
    console.log('QR 스캐너 UI 표시 시작...');
    // 먼저 UI를 표시 (video 엘리먼트 렌더링)
    setScanResult(''); // 이전 스캔 결과 초기화
    setIsScanning(true);
    
    // 짧은 지연 후 스캐너 초기화 (DOM 렌더링 대기)
    setTimeout(initializeScanner, 100);
  };

  // isScanning 상태가 변경될 때 자동으로 스캐너 초기화 (백업)
  useEffect(() => {
    if (isScanning && !qrScannerRef.current) {
      console.log('useEffect에서 스캐너 초기화 시도');
      initializeScanner();
    }
  }, [isScanning, initializeScanner]);


  // 현재 시간 표시용
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 컴포넌트 정리 시 QR 스캐너 중지
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
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

              <div className="space-y-6">
                {/* 지갑 연결 상태 표시 (선택적) */}
                {isConnected && address ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">연결된 지갑</p>
                    <p className="font-mono text-sm text-gray-900 mt-1">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">지갑 미연결</p>
                    <p className="text-xs text-gray-500 mt-1">QR 스캔으로 출석 가능</p>
                  </div>
                )}

                  {/* QR 코드 스캔 안내 */}
                  <div className="p-6 rounded-lg bg-blue-100">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <p className="font-semibold text-lg">QR 코드 스캔 출석</p>
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-2">
                      지갑 주소 QR 코드를 스캔하여 출석체크하세요.
                    </p>
                  </div>

                  {/* QR 스캐너 영역 */}
                  {isScanning && (
                    <div className="bg-gray-100 p-6 rounded-lg">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">QR 코드를 스캔하세요</h3>
                        <p className="text-sm text-gray-600">지갑 주소 QR 코드를 화면 중앙에 맞춰주세요</p>
                      </div>
                      
                      <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
                        <video
                          ref={videoRef}
                          className="w-full h-80 object-cover"
                          playsInline
                          muted
                          autoPlay
                        />
                        
                        {/* 스캔 가이드 오버레이 */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative">
                            {/* 메인 스캔 영역 */}
                            <div className="border-4 border-green-400 rounded-lg w-56 h-56 bg-transparent"></div>
                            
                            {/* 코너 가이드 */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg"></div>
                            
                            {/* 스캔 라인 애니메이션 */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-pulse"></div>
                          </div>
                        </div>
                        
                        {/* 상태 표시 오버레이 */}
                        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
                          🔍 스캔 중...
                        </div>
                      </div>

                      {/* 컨트롤 버튼들 */}
                      <div className="flex justify-center gap-4 mt-6">
                        <button
                          onClick={stopScanning}
                          disabled={isLoading}
                          className="bg-red-500 text-white py-2 px-6 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          스캔 중지
                        </button>
                      </div>

                      {/* 도움말 */}
                      <div className="mt-4 text-center">
                        <p className="text-xs text-gray-500">
                          💡 QR 코드가 인식되지 않으면 카메라와의 거리를 조절해보세요
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 출석 버튼 */}
                  {!isScanning && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleCheckIn}
                        disabled={isLoading || isPending}
                        className="bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading || isPending ? '처리 중...' : 'QR 코드로 출석체크'}
                      </button>
                    </div>
                  )}

                  {/* QR 스캔 결과 표시 */}
                  {scanResult && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">스캔 결과</h4>
                      <p className="font-mono text-sm text-blue-800 break-all">{scanResult}</p>
                    </div>
                  )}

                  {/* 상태 메시지 */}
                  {isPending && <p className="text-center text-blue-600">트랜잭션 전송 중...</p>}
                  {error && (
                    <p className="text-center text-red-600">
                      오류: {error.message}
                    </p>
                  )}
                </div>
            </div>
          </div>
        </div>

        {/* 출석 기록 카드 */}
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
                <p className="text-sm mt-2">QR 코드로 첫 번째 출석체크를 해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
